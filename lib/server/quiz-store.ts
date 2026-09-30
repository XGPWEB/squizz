import "server-only";
import type { Plan, Prisma, Quiz as QuizRow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { demos, type Quiz } from "@/lib/quizzes";
import { normalizeQuestion, validateQuestion, type Question } from "@/lib/question";
import { orgLimits } from "@/lib/plans";
import { withOrgLock } from "./org-lock";
import { fail, validated } from "./http";
import type { SessionUser } from "./guard";

export const MAX_QUESTIONS = 30;
export const MAX_TITLE = 90;

type Member = SessionUser & { organizationId: string; organization: { plan: Plan; partner: boolean } };

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
    fail(`Ajoutez un titre et de 1 à ${MAX_QUESTIONS} questions.`);
  const questions = validated(() => (v.questions as unknown[]).map(validateQuestion));
  return { title: v.title.trim(), questions };
}

export type OrgQuiz = Quiz & {
  createdBy: string | null;
  updatedBy: string | null;
  canEdit: boolean;
  /** Created by the person asking (the « Mes quiz » filter). */
  mine: boolean;
  version: number;
  updatedAt: string;
};

const withNames = {
  createdBy: { select: { name: true } },
  updatedBy: { select: { name: true } },
} as const;
type Row = QuizRow & { createdBy: { name: string } | null; updatedBy: { name: string } | null };

/** Idempotency keys come from the browser: short, URL-safe, or ignored. */
const clientKeyOf = (value: unknown) =>
  typeof value === "string" && /^[\w-]{8,64}$/.test(value) ? value : null;

/** Same JSON whatever the key order (Postgres stores JSON objects with its own key order). */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}

function toQuiz(row: Row, user: SessionUser): OrgQuiz {
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
    updatedBy: row.updatedBy?.name ?? null,
    canEdit: row.createdById === user.id || user.role !== "HOST",
    mine: row.createdById === user.id,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listQuizzes(user: Member): Promise<OrgQuiz[]> {
  const rows = await prisma.quiz.findMany({
    where: { organizationId: user.organizationId },
    include: withNames,
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
    include: withNames,
  });
  return row ? toQuiz(row, user) : null;
}

/**
 * Creates a quiz within the plan's quota. With a `clientKey`, a retried request (response lost on the
 * way back) returns the quiz created the first time instead of a duplicate.
 */
export async function createQuiz(user: Member, draft: unknown, key?: unknown): Promise<OrgQuiz> {
  const input = parseQuizInput(draft);
  const clientKey = clientKeyOf(key);
  const { maxQuizzes } = orgLimits(user.organization);
  const row = await withOrgLock(user.organizationId, async (tx) => {
    if (clientKey) {
      const done = await tx.quiz.findUnique({
        where: { organizationId_clientKey: { organizationId: user.organizationId, clientKey } },
        include: withNames,
      });
      if (done) return done;
    }
    if (maxQuizzes !== null) {
      const count = await tx.quiz.count({ where: { organizationId: user.organizationId } });
      if (count >= maxQuizzes)
        fail(
          `Votre offre permet ${maxQuizzes} quiz. Supprimez-en un ou passez à une offre supérieure (page Tarifs).`,
          403,
        );
    }
    return tx.quiz.create({
      data: {
        organizationId: user.organizationId,
        createdById: user.id,
        updatedById: user.id,
        clientKey,
        title: input.title,
        questions: input.questions as unknown as Prisma.InputJsonValue,
      },
      include: withNames,
    });
  });
  return toQuiz(row, user);
}

/**
 * Copies a quiz of the organisation or a SQuizz Original into a new quiz owned by the person asking. Any
 * member may copy what they can play; the copy counts in the quota and reuses the same media files.
 */
export async function duplicateQuiz(user: Member, id: unknown, key?: unknown): Promise<OrgQuiz> {
  const source = await findQuiz(user, id);
  if (!source) fail("Quiz introuvable.", 404);
  const suffix = " (copie)";
  const title = source.title.slice(0, MAX_TITLE - suffix.length).trimEnd() + suffix;
  return createQuiz(user, { title, questions: source.questions }, key);
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

/**
 * Saves a quiz only if nobody saved it since the editor opened it (`base` = the version it loaded): the
 * check and the write are one atomic UPDATE. A retry of a save that already went through (same content)
 * succeeds; a real conflict answers 409 with the other version, so the editor can let the person choose.
 * `force` overwrites on purpose, after that choice.
 */
export async function updateQuiz(
  user: Member,
  id: unknown,
  draft: unknown,
  base?: unknown,
  force = false,
): Promise<OrgQuiz> {
  const row = await editableQuiz(user, id);
  const input = parseQuizInput(draft);
  const data = {
    title: input.title,
    questions: input.questions as unknown as Prisma.InputJsonValue,
    updatedById: user.id,
    version: { increment: 1 },
  };
  const baseVersion = Number.isInteger(base) ? (base as number) : null;
  if (force || baseVersion === null) {
    const updated = await prisma.quiz.update({ where: { id: row.id }, data, include: withNames });
    return toQuiz(updated, user);
  }
  const { count } = await prisma.quiz.updateMany({ where: { id: row.id, version: baseVersion }, data });
  const current = await prisma.quiz.findUniqueOrThrow({ where: { id: row.id }, include: withNames });
  if (count) return toQuiz(current, user);
  const same = current.title === input.title && canonical(current.questions) === canonical(input.questions);
  if (same) return toQuiz(current, user);
  const other = toQuiz(current, user);
  const byMe = current.updatedById === user.id;
  fail(
    byMe
      ? "Vous avez enregistré ce quiz depuis un autre onglet ou appareil pendant que vous le modifiiez ici. Choisissez la version à garder."
      : `${other.updatedBy ?? "Un autre membre"} a enregistré ce quiz pendant que vous le modifiiez. Choisissez la version à garder.`,
    409,
    {
      conflict: {
        version: other.version,
        updatedAt: other.updatedAt,
        updatedBy: other.updatedBy,
        byMe,
        title: other.title,
        questions: other.questions,
      },
    },
  );
}

/** Games already started keep their own snapshot, so deleting a quiz never breaks them. */
export async function deleteQuiz(user: Member, id: unknown): Promise<void> {
  const row = await editableQuiz(user, id);
  await prisma.quiz.delete({ where: { id: row.id } });
}
