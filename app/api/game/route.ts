import { demos } from "@/lib/quizzes";
import { identity, identityHeaders, lightIdentity } from "@/lib/identity";
import { orgLimits } from "@/lib/plans";
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
import {
  createRoom,
  gameState,
  joinRoom,
  kickPlayer,
  loadGame,
  nextQuestion,
  parseCode,
  spinWheel,
  startGame,
  submitAnswer,
} from "@/lib/server/game";
export const dynamic = "force-dynamic";

type Handler = (who: string, body: Body, req: Request) => Promise<unknown>;

/** Actions allowed over GET because they have no side effects. */
const readOnly = new Set(["list", "state"]);

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
    return { code: await createRoom(user.id, user.organizationId, quiz, max, body.clientKey) };
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
