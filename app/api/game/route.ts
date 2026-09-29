import { demos } from "@/lib/quizzes";
import { identity, identityHeaders } from "@/lib/identity";
import { planLimits } from "@/lib/plans";
import { fail, HttpError, readBody, type Body } from "@/lib/server/http";
import { requireMember } from "@/lib/server/guard";
import { createQuiz, deleteQuiz, findQuiz, listQuizzes, updateQuiz } from "@/lib/server/quiz-store";
import {
  createRoom,
  gameState,
  joinRoom,
  loadGame,
  nextQuestion,
  parseCode,
  startGame,
  submitAnswer,
} from "@/lib/server/game";
export const dynamic = "force-dynamic";

type Handler = (who: string, body: Body) => Promise<unknown>;

/** Actions allowed over GET because they have no side effects. */
const readOnly = new Set(["list", "state"]);

const actions: Record<string, Handler> = {
  // Quiz library and editing: signed-in members of an active organisation only.
  list: async () => {
    const user = await requireMember();
    return { quizzes: [...demos, ...(await listQuizzes(user))] };
  },
  save: async (_, body) => ({ quiz: await createQuiz(await requireMember(), body.quiz) }),
  update: async (_, body) => ({ quiz: await updateQuiz(await requireMember(), body.quizId, body.quiz) }),
  delete: async (_, body) => {
    await deleteQuiz(await requireMember(), body.quizId);
    return { ok: true };
  },
  create: async (_, body) => {
    const user = await requireMember();
    const quiz = await findQuiz(user, body.quizId);
    if (!quiz) fail("Quiz introuvable.", 404);
    const max = planLimits(user.organization.plan).maxPlayersPerGame;
    return { code: await createRoom(user.id, user.organizationId, quiz, max) };
  },
  // Playing: anyone with the code, signed in or not.
  join: async (who, body) => {
    const code = parseCode(body.code);
    await joinRoom(who, code, body.name);
    return { code };
  },
  state: async (who, body) => gameState(await loadGame(who, parseCode(body.code))),
  answer: async (who, body) => {
    await submitAnswer(await loadGame(who, parseCode(body.code)), body);
    return { accepted: true };
  },
  start: async (who, body) => {
    await startGame(await loadGame(who, parseCode(body.code)));
    return { ok: true };
  },
  next: async (who, body) => {
    await nextQuestion(await loadGame(who, parseCode(body.code)), body);
    return { ok: true };
  },
};

async function handle(req: Request) {
  const who = await identity(req);
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: identityHeaders(req, who) });
  try {
    const body = await readBody(req);
    const action = String(body.action || "list");
    const handler = Object.hasOwn(actions, action) ? actions[action] : null;
    if (!handler) fail("Action inconnue.");
    if (req.method !== "POST" && !readOnly.has(action)) fail("Méthode non autorisée.", 405);
    return reply(await handler(who.id, body));
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.message }, error.status);
    console.error(error);
    return reply({ error: "Une erreur empêche cette action. Réessaie dans un instant." }, 503);
  }
}
export const GET = handle;
export const POST = handle;
