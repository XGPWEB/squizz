import "server-only";
import type { Plan, Prisma, Quiz as QuizRow, QuizVisibility, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { demos, type Quiz } from "@/lib/quizzes";
import { normalizeQuestion, validateQuestion, type Question } from "@/lib/question";
import { orgLimits } from "@/lib/plans";
import { isProfileQuiz, quizProfiles, validateProfiles } from "@/lib/profiles";
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
  const questions = validated(() => {
    const checked = (v.questions as unknown[]).map(validateQuestion);
    validateProfiles(checked);
    return checked;
  });
  return { title: v.title.trim(), questions };
}

export type Sharing = { visibility: QuizVisibility; sharedWith: string[] };
const VISIBILITIES: QuizVisibility[] = ["PRIVATE", "SELECTED", "TEAM"];

/**
 * Who sees a quiz, as asked by its author: a private draft, chosen members, or the whole team. Returns
 * null when the draft says nothing about it. Only active members of the same organisation can be chosen.
 */
async function parseSharing(user: Member, value: unknown): Promise<Sharing | null> {
  const v = value as { visibility?: unknown; sharedWith?: unknown } | null;
  if (!v || v.visibility === undefined) return null;
  if (!VISIBILITIES.includes(v.visibility as QuizVisibility)) fail("Visibilité du quiz invalide.");
  const visibility = v.visibility as QuizVisibility;
  if (visibility !== "SELECTED") return { visibility, sharedWith: [] };
  const asked = Array.isArray(v.sharedWith) ? v.sharedWith.filter((id) => typeof id === "string") : [];
  const members = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      id: { in: [...new Set(asked)].slice(0, 200), not: user.id },
    },
    select: { id: true },
  });
  if (!members.length) fail("Choisissez au moins une personne de l’équipe avec qui partager ce quiz.");
  return { visibility, sharedWith: members.map((m) => m.id).sort() };
}

export type OrgQuiz = Quiz & {
  createdBy: string | null;
  updatedBy: string | null;
  canEdit: boolean;
  /** Its author, or an administrator when the author is gone: may delete it and choose who sees it. */
  canManage: boolean;
  visibility: QuizVisibility;
  sharedWith: string[];
  /** Created by the person asking (the « Mes quiz » filter). */
  mine: boolean;
  version: number;
  updatedAt: string;
};

const withNames = {
  createdBy: { select: { name: true, active: true, role: true } },
  updatedBy: { select: { name: true } },
} as const;
type Row = QuizRow & {
  createdBy: { name: string; active: boolean; role: UserRole } | null;
  updatedBy: { name: string } | null;
};

/**
 * Access to a quiz inside its organisation.
 * - Its author always sees it, edits it, deletes it and chooses who else sees it.
 * - PRIVATE: nobody else. SELECTED: the chosen members see it and edit it too. TEAM: every member sees and
 *   plays it, and administrators edit and delete it.
 * - A quiz whose author left (account removed or deactivated) goes to the administrators, whatever its
 *   visibility, so it never stays out of everyone's reach. So does a quiz made by the super-admin while
 *   viewing the organisation as its administrator: it belongs to the organisation, not to an account its
 *   members cannot reach.
 */
const orphan = (row: Pick<Row, "createdById" | "createdBy">) =>
  !row.createdById || row.createdBy?.active === false || row.createdBy?.role === "SUPER_ADMIN";
const adopts = (row: Pick<Row, "createdById" | "createdBy">, user: SessionUser) =>
  user.role !== "HOST" && orphan(row);
const canManage = (row: Row, user: SessionUser) => row.createdById === user.id || adopts(row, user);
const canEdit = (row: Row, user: SessionUser) =>
  canManage(row, user) ||
  (row.visibility === "TEAM" && user.role !== "HOST") ||
  (row.visibility === "SELECTED" && row.sharedWith.includes(user.id));
const canDelete = (row: Row, user: SessionUser) =>
  canManage(row, user) || (row.visibility === "TEAM" && user.role !== "HOST");
/** The quizzes of the organisation that `user` may see. */
const visibleTo = (user: Member): Prisma.QuizWhereInput => ({
  organizationId: user.organizationId,
  OR: [
    { visibility: "TEAM" },
    { createdById: user.id },
    { visibility: "SELECTED", sharedWith: { has: user.id } },
    ...(user.role !== "HOST"
      ? [
          { createdById: null },
          { createdBy: { active: false } },
          { createdBy: { role: "SUPER_ADMIN" as const } },
        ]
      : []),
  ],
});

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
    tag: isProfileQuiz(questions) ? "QUIZ À PROFILS" : "VOTRE CRÉATION",
    symbol: "✦",
    color: "purple",
    desc: isProfileQuiz(questions)
      ? `${questions.length} étape${questions.length > 1 ? "s" : ""}, ${quizProfiles(questions).length} profils à révéler.`
      : `${questions.length} étape${questions.length > 1 ? "s" : ""} à partager.`,
    createdBy: row.createdBy?.name ?? null,
    updatedBy: row.updatedBy?.name ?? null,
    canEdit: canEdit(row, user),
    canManage: canManage(row, user),
    visibility: row.visibility,
    sharedWith: row.sharedWith,
    mine: row.createdById === user.id,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listQuizzes(user: Member): Promise<OrgQuiz[]> {
  const rows = await prisma.quiz.findMany({
    where: visibleTo(user),
    include: withNames,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toQuiz(row, user));
}

/** Finds a demo quiz or one of the organisation's quizzes that the person may see. */
export async function findQuiz(user: Member, id: unknown): Promise<Quiz | null> {
  const demo = demos.find((q) => q.id === id);
  if (demo) return demo;
  const row = await prisma.quiz.findFirst({
    where: { AND: [{ id: String(id) }, visibleTo(user)] },
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
  const sharing = await parseSharing(user, draft);
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
        ...(sharing ?? {}),
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
  // The copy of a quiz that not everyone sees starts as a private draft of the person copying it.
  const visibility = "visibility" in source && source.visibility !== "TEAM" ? "PRIVATE" : "TEAM";
  return createQuiz(user, { title, questions: source.questions, visibility }, key);
}

/** The quiz to change or delete, when the person may (see the access rules above); refuses otherwise. */
async function editableQuiz(user: Member, id: unknown, action: "edit" | "delete" = "edit") {
  if (isDemo(id)) fail("Les quiz SQuizz Originals ne peuvent pas être modifiés.", 403);
  const row = await prisma.quiz.findFirst({
    where: { AND: [{ id: String(id) }, visibleTo(user)] },
    include: withNames,
  });
  if (!row) fail("Quiz introuvable.", 404);
  if (!(action === "delete" ? canDelete : canEdit)(row, user))
    fail(
      action === "delete"
        ? "Seul l’auteur du quiz ou un administrateur peut le supprimer."
        : "Seul l’auteur du quiz, les personnes avec qui il le partage ou un administrateur peuvent le modifier.",
      403,
    );
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
  // Who sees the quiz is its author's decision: sent by anyone else, it is left as it is.
  const sharing = canManage(row, user) ? await parseSharing(user, draft) : null;
  const data = {
    title: input.title,
    questions: input.questions as unknown as Prisma.InputJsonValue,
    ...(sharing ?? {}),
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
  const same =
    current.title === input.title &&
    canonical(current.questions) === canonical(input.questions) &&
    (!sharing ||
      (current.visibility === sharing.visibility &&
        canonical([...current.sharedWith].sort()) === canonical(sharing.sharedWith)));
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
        visibility: other.visibility,
        sharedWith: other.sharedWith,
      },
    },
  );
}

/** Games already started keep their own snapshot, so deleting a quiz never breaks them. */
export async function deleteQuiz(user: Member, id: unknown): Promise<void> {
  const row = await editableQuiz(user, id, "delete");
  await prisma.quiz.delete({ where: { id: row.id } });
}

/** The other active members of the organisation, to choose who a quiz is shared with. */
export async function teammates(user: { id: string; organizationId: string | null }) {
  if (!user.organizationId) return [];
  return prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      id: { not: user.id },
      role: { not: "SUPER_ADMIN" },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
