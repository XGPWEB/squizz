import { demos } from "@/lib/quizzes";
import { identity, identityHeaders, lightIdentity } from "@/lib/identity";
import { orgLimits } from "@/lib/plans";
import { brandOf } from "@/lib/brand";
import { assertSameOrigin, fail, HttpError, readBody, type Body } from "@/lib/server/http";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { requireMember } from "@/lib/server/guard";
import { errorMessage, reportAlert } from "@/lib/server/monitoring";
import {
  createQuiz,
  deleteQuiz,
  duplicateQuiz,
  findQuiz,
  listQuizzes,
  updateQuiz,
} from "@/lib/server/quiz-store";
import { exportQuiz, importQuiz } from "@/lib/server/quiz-transfer";
import { closeSolo, createReplay, createSolo } from "@/lib/server/solo";
import {
  createRoom,
  gameState,
  joinRoom,
  kickPlayer,
  loadGame,
  nextQuestion,
  parseCode,
  closeQuestion,
  wallAction,
  pickTeam,
  remoteHost,
  remoteToken,
  setTeams,
  shuffleTeams,
  spinWheel,
  startGame,
  submitAnswer,
} from "@/lib/server/game";
export const dynamic = "force-dynamic";

type Handler = (who: string, body: Body, req: Request) => Promise<unknown>;

/** Actions allowed over GET because they have no side effects. */
const readOnly = new Set(["list", "state"]);
/** What the remote control may do, as the host: follow the game and drive it (never the link itself). */
const remoteActions = new Set([
  "state",
  "start",
  "next",
  "close",
  "spin",
  "kick",
  "qa-settings",
  "qa-moderate",
]);

const actions: Record<string, Handler> = {
  // Quiz library and editing: signed-in members of an active organisation only.
  list: async () => {
    const user = await requireMember();
    return { quizzes: [...demos, ...(await listQuizzes(user))] };
  },
  save: async (_, body) => ({ quiz: await createQuiz(await requireMember(), body.quiz, body.clientKey) }),
  update: async (_, body) => ({
    quiz: await updateQuiz(await requireMember(), body.quizId, body.quiz, body.version, body.force === true),
  }),
  export: async (_, body) => ({ file: await exportQuiz(await requireMember(), body.quizId) }),
  import: async (_, body) => ({
    quiz: await importQuiz(await requireMember(), body.file, body.clientKey),
  }),
  duplicate: async (_, body) => ({
    quiz: await duplicateQuiz(await requireMember(), body.quizId, body.clientKey),
  }),
  delete: async (_, body) => {
    await deleteQuiz(await requireMember(), body.quizId);
    return { ok: true };
  },
  create: async (_, body) => {
    const user = await requireMember();
    const quiz = await findQuiz(user, body.quizId);
    if (!quiz) fail("Quiz introuvable.", 404);
    const max = orgLimits(user.organization).maxPlayersPerGame;
    const brand = brandOf(user.organization);
    return { code: await createRoom(user.id, user.organizationId, quiz, max, body.clientKey, brand, {
        count: body.teams,
        names: body.teamNames,
      }) };
  },
  // Self-paced links: opened from the library, or from a live game once it is over.
  solo: async (_, body) => {
    const user = await requireMember();
    const quiz = await findQuiz(user, body.quizId);
    if (!quiz) fail("Quiz introuvable.", 404);
    return { id: await createSolo(user, quiz, body.days, brandOf(user.organization)) };
  },
  "solo-close": async (_, body) => {
    await closeSolo(await requireMember(), body.id);
    return { ok: true };
  },
  replay: async (who, body) => {
    const g = await loadGame(who, parseCode(body.code), true);
    if (g.room.phase !== "finished") fail("Le replay s’ouvre à la fin de la partie.");
    return { id: await createReplay(g.room.code, who) };
  },
  // Playing: anyone with the code, signed in or not.
  join: async (who, body, req) => {
    // Generous for a whole classroom behind one address, but stops a script filling or probing games.
    if (!(await rateLimit(`join:${clientIp(req.headers)}`, 300, 10 * 60)).allowed)
      fail("Trop de tentatives depuis votre connexion. Réessayez dans quelques minutes.", 429);
    const code = parseCode(body.code);
    await joinRoom(who, code, body.name);
    return { code };
  },
  state: async (who, body) => gameState(await loadGame(who, parseCode(body.code))),
  answer: async (who, body) => {
    await submitAnswer(await loadGame(who, parseCode(body.code), true), body);
    return { accepted: true };
  },
  start: async (who, body) => {
    const startsIn = await startGame(await loadGame(who, parseCode(body.code), true));
    return { ok: true, startsIn };
  },
  next: async (who, body) => {
    const startsIn = await nextQuestion(await loadGame(who, parseCode(body.code), true), body);
    return { ok: true, startsIn };
  },
  teams: async (who, body) => {
    await setTeams(await loadGame(who, parseCode(body.code), true), body.count);
    return { ok: true };
  },
  team: async (who, body) => {
    await pickTeam(await loadGame(who, parseCode(body.code), true), body.team);
    return { ok: true };
  },
  shuffle: async (who, body) => {
    await shuffleTeams(await loadGame(who, parseCode(body.code), true));
    return { ok: true };
  },
  "qa-ask": async (who, body, req) => {
    // Generous for a whole room behind one address, but stops a script flooding the wall.
    if (!(await rateLimit(`qa:${clientIp(req.headers)}`, 120, 10 * 60)).allowed)
      fail("Trop de questions depuis votre connexion. Réessayez dans quelques minutes.", 429);
    await wallAction(await loadGame(who, parseCode(body.code), true), "qa-ask", body);
    return { ok: true };
  },
  "qa-vote": async (who, body) => {
    await wallAction(await loadGame(who, parseCode(body.code), true), "qa-vote", body);
    return { ok: true };
  },
  "qa-settings": async (who, body) => {
    await wallAction(await loadGame(who, parseCode(body.code), true), "qa-settings", body);
    return { ok: true };
  },
  "qa-moderate": async (who, body) => {
    await wallAction(await loadGame(who, parseCode(body.code), true), "qa-moderate", body);
    return { ok: true };
  },
  remote: async (who, body) => ({
    token: await remoteToken(await loadGame(who, parseCode(body.code), true)),
  }),
  close: async (who, body) => {
    await closeQuestion(await loadGame(who, parseCode(body.code), true), body);
    return { ok: true };
  },
  spin: async (who, body) => {
    await spinWheel(await loadGame(who, parseCode(body.code), true), body);
    return { ok: true };
  },
  kick: async (who, body) => {
    await kickPlayer(await loadGame(who, parseCode(body.code), true), body.name);
    return { ok: true };
  },
};

async function handle(req: Request) {
  // Polling is ~1 request per second per phone: it only needs to know who is asking.
  const polling = req.method === "GET" && new URL(req.url).searchParams.get("action") === "state";
  const who = polling ? await lightIdentity(req) : await identity(req);
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: identityHeaders(req, who) });
  // Named in the alert of an unexpected error: only ever one of the actions above, never what was sent.
  let known: string | undefined;
  try {
    assertSameOrigin(req);
    const body = await readBody(req);
    const action = String(body.action || "list");
    const handler = Object.hasOwn(actions, action) ? actions[action] : null;
    if (!handler) fail("Action inconnue.");
    known = action;
    if (req.method !== "POST" && !readOnly.has(action)) fail("Méthode non autorisée.", 405);
    // The host's phone, through the secret link shown on the big screen (POST only: no secret in an URL).
    if (body.remote !== undefined) {
      if (req.method !== "POST" || !remoteActions.has(action))
        fail("Action impossible depuis la télécommande.", 403);
      return reply(await handler(await remoteHost(parseCode(body.code), body.remote), body, req));
    }
    return reply(await handler(who.id, body, req));
  } catch (error) {
    // Ordinary refusals (full game, wrong code, limit reached…) are answers, not alerts.
    if (error instanceof HttpError) return reply({ ...error.details, error: error.message }, error.status);
    console.error(error);
    void reportAlert({
      type: "server",
      message: errorMessage(error),
      path: new URL(req.url).pathname,
      context: { method: req.method, action: known },
    });
    return reply({ error: "Une erreur empêche cette action. Réessaie dans un instant." }, 500);
  }
}
export const GET = handle;
export const POST = handle;
