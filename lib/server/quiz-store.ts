import { demos, type Quiz } from "@/lib/quizzes";
import { normalizeQuestion, validateQuestion } from "@/lib/question";
import { fail, validated } from "./http";

export const MAX_QUESTIONS = 30;
export const MAX_TITLE = 90;

export function normalizeQuiz(raw: Quiz): Quiz {
  return { ...raw, questions: raw.questions.map(normalizeQuestion) };
}

export const isDemo = (id: unknown) => demos.some((q) => q.id === id);

/** Validates an untrusted quiz draft and returns its title and questions. */
export function parseQuizInput(value: any) {
  if (
    !value ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > MAX_TITLE ||
    !Array.isArray(value.questions) ||
    value.questions.length < 1 ||
    value.questions.length > MAX_QUESTIONS
  )
    fail(`Ajoute un titre et de 1 à ${MAX_QUESTIONS} questions.`);
  const questions = validated(() => value.questions.map(validateQuestion));
  return { title: value.title.trim() as string, questions };
}

function buildQuiz(id: string, input: ReturnType<typeof parseQuizInput>): Quiz {
  return {
    id,
    title: input.title,
    questions: input.questions,
    tag: "VOTRE CRÉATION",
    symbol: "✦",
    color: "purple",
    desc: `${input.questions.length} étape${input.questions.length > 1 ? "s" : ""} à partager.`,
  };
}

export async function listQuizzes(db: D1Database, owner: string): Promise<Quiz[]> {
  const rows = await db
    .prepare("SELECT data FROM quizzes WHERE owner = ? ORDER BY rowid")
    .bind(owner)
    .all<{ data: string }>();
  return rows.results.map((row) => normalizeQuiz(JSON.parse(row.data)));
}

/** Finds a demo quiz or one of the owner's quizzes. */
export async function findQuiz(db: D1Database, owner: string, id: unknown): Promise<Quiz | null> {
  const demo = demos.find((q) => q.id === id);
  if (demo) return demo;
  const row = await db
    .prepare("SELECT data FROM quizzes WHERE id = ? AND owner = ?")
    .bind(String(id), owner)
    .first<{ data: string }>();
  return row ? normalizeQuiz(JSON.parse(row.data)) : null;
}

export async function createQuiz(db: D1Database, owner: string, draft: unknown): Promise<Quiz> {
  const quiz = buildQuiz(crypto.randomUUID(), parseQuizInput(draft));
  await db
    .prepare("INSERT INTO quizzes (id,owner,data) VALUES (?,?,?)")
    .bind(quiz.id, owner, JSON.stringify(quiz))
    .run();
  return quiz;
}

export async function updateQuiz(db: D1Database, owner: string, id: unknown, draft: unknown): Promise<Quiz> {
  if (isDemo(id)) fail("Les quiz SQuizz Originals ne peuvent pas être modifiés.", 403);
  const quiz = buildQuiz(String(id), parseQuizInput(draft));
  const result = await db
    .prepare("UPDATE quizzes SET data = ? WHERE id = ? AND owner = ?")
    .bind(JSON.stringify(quiz), quiz.id, owner)
    .run();
  if (!result.meta.changes) fail("Quiz introuvable.", 404);
  return quiz;
}

/** Games already started keep their own snapshot, so deleting a quiz never breaks them. */
export async function deleteQuiz(db: D1Database, owner: string, id: unknown): Promise<void> {
  if (isDemo(id)) fail("Les quiz SQuizz Originals ne peuvent pas être supprimés.", 403);
  const result = await db
    .prepare("DELETE FROM quizzes WHERE id = ? AND owner = ?")
    .bind(String(id), owner)
    .run();
  if (!result.meta.changes) fail("Quiz introuvable.", 404);
}
