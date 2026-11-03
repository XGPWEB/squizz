import "server-only";
import { prisma } from "@/lib/prisma";
import { fail, type Body } from "./http";

/** Questions from the audience: limits that keep the wall readable. */
export const QA_MAX_LENGTH = 280;
export const QA_PER_PLAYER = 5;
export const QA_STATUSES = ["pending", "visible", "answered", "hidden"] as const;
export type QaStatus = (typeof QA_STATUSES)[number];

export type QaItem = {
  id: string;
  text: string;
  /** The nickname, or null when asked anonymously. */
  author: string | null;
  status: QaStatus;
  votes: number;
  /** Asked or voted for by the visitor. */
  mine: boolean;
  voted: boolean;
};

/** Every question of a game's wall, read once for all its visitors (see the game snapshot). */
export const loadWall = (code: string) =>
  prisma.qaQuestion.findMany({
    where: { code },
    select: {
      id: true,
      text: true,
      author: true,
      status: true,
      player: true,
      createdAt: true,
      votes: { select: { player: true } },
    },
  });
export type WallRows = Awaited<ReturnType<typeof loadWall>>;

/** The wall as one visitor sees it: everything for the host; approved questions and their own for a player. */
export function wallFor(rows: WallRows, viewer: string, host: boolean): QaItem[] {
  return rows
    .filter((q) => host || q.status === "visible" || q.status === "answered" || q.player === viewer)
    .filter((q) => host || q.status !== "hidden" || q.player === viewer)
    .map((q) => ({
      id: q.id,
      text: q.text,
      author: q.author,
      status: q.status as QaStatus,
      votes: q.votes.length,
      mine: q.player === viewer,
      voted: q.votes.some((v) => v.player === viewer),
      at: q.createdAt.getTime(),
    }))
    .sort(
      (a, b) =>
        Number(a.status === "answered") - Number(b.status === "answered") || b.votes - a.votes || a.at - b.at,
    )
    .map(({ at, ...q }) => {
      void at;
      return q;
    });
}

type Wall = { code: string; qaOpen: boolean; qaModerated: boolean };

/** A player asks a question, with their nickname or anonymously. */
export async function askQuestion(room: Wall, who: string, name: string, body: Body) {
  if (!room.qaOpen) fail("Les questions ne sont pas ouvertes pour le moment.");
  const text = typeof body.text === "string" ? body.text.trim().replace(/\s+/g, " ") : "";
  if (!text) fail("Écris ta question.");
  if (text.length > QA_MAX_LENGTH) fail(`Ta question est limitée à ${QA_MAX_LENGTH} caractères.`);
  const asked = await prisma.qaQuestion.count({ where: { code: room.code, player: who } });
  if (asked >= QA_PER_PLAYER) fail(`Tu as déjà posé ${QA_PER_PLAYER} questions dans cette partie.`);
  // The same question sent twice (a retry after a lost response) is kept once.
  const twin = await prisma.qaQuestion.findFirst({ where: { code: room.code, player: who, text } });
  if (twin) return;
  await prisma.qaQuestion.create({
    data: {
      code: room.code,
      player: who,
      author: body.anonymous === true ? null : name,
      text,
      status: room.qaModerated ? "pending" : "visible",
    },
  });
}

/** A player supports a question (or takes back their vote). */
export async function voteQuestion(room: Wall, who: string, body: Body) {
  const question = await prisma.qaQuestion.findFirst({
    where: { id: String(body.id ?? ""), code: room.code, status: { in: ["visible", "answered"] } },
  });
  if (!question) fail("Question introuvable.", 404);
  if (question.player === who) fail("Tu ne peux pas voter pour ta propre question.");
  const key = { questionId_player: { questionId: question.id, player: who } };
  const vote = body.vote !== false;
  if (vote)
    await prisma.qaVote.upsert({ where: key, create: { questionId: question.id, player: who }, update: {} });
  else await prisma.qaVote.deleteMany({ where: { questionId: question.id, player: who } });
}

/** The host opens or closes the wall, and chooses whether questions wait for approval. */
export async function wallSettings(room: Wall, body: Body) {
  const qaOpen = body.open === true;
  const qaModerated = body.moderated === true;
  await prisma.room.update({ where: { code: room.code }, data: { qaOpen, qaModerated } });
  // Turning moderation off shows what was waiting.
  if (!qaModerated)
    await prisma.qaQuestion.updateMany({
      where: { code: room.code, status: "pending" },
      data: { status: "visible" },
    });
}

/** The host approves, hides or marks a question as answered. */
export async function moderateQuestion(room: Wall, body: Body) {
  const status = String(body.status ?? "") as QaStatus;
  if (!QA_STATUSES.includes(status) || status === "pending") fail("Choix invalide.");
  const { count } = await prisma.qaQuestion.updateMany({
    where: { id: String(body.id ?? ""), code: room.code },
    data: { status },
  });
  if (!count) fail("Question introuvable.", 404);
}

/** The questions kept with the results: approved or answered ones, without who asked. */
export async function keptQuestions(code: string) {
  const rows = await prisma.qaQuestion.findMany({
    where: { code, status: { in: ["visible", "answered"] } },
    select: { text: true, status: true, _count: { select: { votes: true } } },
  });
  return rows
    .map((q) => ({ text: q.text, answered: q.status === "answered", votes: q._count.votes }))
    .sort((a, b) => b.votes - a.votes);
}
