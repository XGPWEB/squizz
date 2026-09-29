import type { Prisma, Quiz as QuizRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { demos, type Quiz } from "@/lib/quizzes";
import { normalizeQuestion, validateQuestion, type Question } from "@/lib/question";
import { planLimits } from "@/lib/plans";
import { fail, validated } from "./http";
import type { SessionUser } from "./guard";

export const MAX_QUESTIONS = 30;
export const MAX_TITLE = 90;

type Member = SessionUser & { organizationId: string; organization: { plan: "FREE" | "PRO" } };

export function normalizeQuiz(raw: Quiz): Quiz {
  return { ...raw, questions: raw.questions.map(normalizeQuestion) };
}

export const isDemo = (id: unknown) => demos.some((q) => q.id === id);

/** Validates an untrusted quiz draft and returns its title and questions. */
export function parseQuizInput(value: unknown) {
  const v = value as { title?: unknown; questions?: unknown } | null;
  if (
    !v ||
    typeof v.title !== "string" ||
    !v.title.trim() ||
    v.title.length > MAX_TITLE ||
    !Array.isArray(v.questions) ||
    v.questions.length < 1 ||
    v.questions.length > MAX_QUESTIONS
  )
    fail(`Ajoute un titre et de 1 à ${MAX_QUESTIONS} questions.`);
  const questions = validated(() => (v.questions as unknown[]).map(validateQuestion));
  return { title: v.title.trim(), questions };
}

export type OrgQuiz = Quiz & { createdBy: string | null; canEdit: boolean; updatedAt: string };

function toQuiz(row: QuizRow & { createdBy: { name: string } | null }, user: SessionUser): OrgQuiz {
  const questions = (row.questions as unknown as Question[]).map(normalizeQuestion);
  return {
    id: row.id,
    title: row.title,
    questions,
    tag: "VOTRE CRÉATION",
    symbol: "✦",
    color: "purple",
    desc: `${questions.length} étape${questions.length > 1 ? "s" : ""} à partager.`,
    createdBy: row.createdBy?.name ?? null,
    canEdit: row.createdById === user.id || user.role !== "HOST",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listQuizzes(user: Member): Promise<OrgQuiz[]> {
  const rows = await prisma.quiz.findMany({
    where: { organizationId: user.organizationId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toQuiz(row, user));
}

/** Finds a demo quiz or one of the organisation's quizzes. */
export async function findQuiz(user: Member, id: unknown): Promise<Quiz | null> {
  const demo = demos.find((q) => q.id === id);
  if (demo) return demo;
  const row = await prisma.quiz.findFirst({
    where: { id: String(id), organizationId: user.organizationId },
    include: { createdBy: { select: { name: true } } },
  });
  return row ? toQuiz(row, user) : null;
}

export async function createQuiz(user: Member, draft: unknown): Promise<OrgQuiz> {
  const input = parseQuizInput(draft);
  const { maxQuizzes } = planLimits(user.organization.plan);
  if (maxQuizzes !== null) {
    const count = await prisma.quiz.count({ where: { organizationId: user.organizationId } });
    if (count >= maxQuizzes)
      fail(`Votre offre permet ${maxQuizzes} quiz. Supprimez-en un ou passez à l’offre Pro.`, 403);
  }
  const row = await prisma.quiz.create({
    data: {
      organizationId: user.organizationId,
      createdById: user.id,
      title: input.title,
      questions: input.questions as unknown as Prisma.InputJsonValue,
    },
    include: { createdBy: { select: { name: true } } },
  });
  return toQuiz(row, user);
}

/** Hosts may change only their own quizzes; organisation admins may change all of them. */
async function editableQuiz(user: Member, id: unknown) {
  if (isDemo(id)) fail("Les quiz SQuizz Originals ne peuvent pas être modifiés.", 403);
  const row = await prisma.quiz.findFirst({ where: { id: String(id), organizationId: user.organizationId } });
  if (!row) fail("Quiz introuvable.", 404);
  if (user.role === "HOST" && row.createdById !== user.id)
    fail("Seul l’auteur du quiz ou un administrateur peut le modifier.", 403);
  return row;
}

export async function updateQuiz(user: Member, id: unknown, draft: unknown): Promise<OrgQuiz> {
  const row = await editableQuiz(user, id);
  const input = parseQuizInput(draft);
  const updated = await prisma.quiz.update({
    where: { id: row.id },
    data: { title: input.title, questions: input.questions as unknown as Prisma.InputJsonValue },
    include: { createdBy: { select: { name: true } } },
  });
  return toQuiz(updated, user);
}

/** Games already started keep their own snapshot, so deleting a quiz never breaks them. */
export async function deleteQuiz(user: Member, id: unknown): Promise<void> {
  const row = await editableQuiz(user, id);
  await prisma.quiz.delete({ where: { id: row.id } });
}
