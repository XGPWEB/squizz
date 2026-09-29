import { rawDb } from "@/db";
import { demos } from "@/lib/quizzes";
import { identity, identityHeaders } from "@/lib/identity";
import { fail, HttpError, readBody, type Body } from "@/lib/server/http";
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

type Handler = (db: D1Database, who: string, body: Body) => Promise<unknown>;

/** Actions allowed over GET because they have no side effects. */
const readOnly = new Set(["list", "state"]);

const actions: Record<string, Handler> = {
  list: async (db, who) => ({ quizzes: [...demos, ...(await listQuizzes(db, who))] }),
  save: async (db, who, body) => ({ quiz: await createQuiz(db, who, body.quiz) }),
  update: async (db, who, body) => ({ quiz: await updateQuiz(db, who, body.quizId, body.quiz) }),
  delete: async (db, who, body) => {
    await deleteQuiz(db, who, body.quizId);
    return { ok: true };
  },
  create: async (db, who, body) => {
    const quiz = await findQuiz(db, who, body.quizId);
    if (!quiz) fail("Quiz introuvable.", 404);
    return { code: await createRoom(db, who, quiz) };
  },
  join: async (db, who, body) => {
    const code = parseCode(body.code);
    await joinRoom(db, who, code, body.name);
    return { code };
  },
  state: async (db, who, body) => gameState(await loadGame(db, who, parseCode(body.code))),
  answer: async (db, who, body) => {
    await submitAnswer(await loadGame(db, who, parseCode(body.code)), body);
    return { accepted: true };
  },
  start: async (db, who, body) => {
    await startGame(await loadGame(db, who, parseCode(body.code)));
    return { ok: true };
  },
  next: async (db, who, body) => {
    await nextQuestion(await loadGame(db, who, parseCode(body.code)), body);
    return { ok: true };
  },
};

async function handle(req: Request) {
  const who = identity(req);
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: identityHeaders(req, who) });
  try {
    const body = await readBody(req);
    const action = String(body.action || "list");
    const handler = Object.hasOwn(actions, action) ? actions[action] : null;
    if (!handler) fail("Action inconnue.");
    if (req.method !== "POST" && !readOnly.has(action)) fail("Méthode non autorisée.", 405);
    return reply(await handler(rawDb(), who.id, body));
  } catch (error) {
    if (error instanceof HttpError) return reply({ error: error.message }, error.status);
    console.error(error);
    return reply({ error: "Une erreur empêche cette action. Réessaie dans un instant." }, 503);
  }
}
export const GET = handle;
export const POST = handle;
