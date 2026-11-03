import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Quiz } from "@/lib/quizzes";
import type { AnswerPayload } from "@/lib/question";
import { buildReport, type ReportData } from "@/lib/report";
import { fail } from "./http";
import type { SessionUser } from "./guard";
import { normalizeQuiz } from "./quiz-store";
import { keptQuestions } from "./qa";

/** Reports are kept 12 months (deploy/purge.mjs, privacy policy). */
export const REPORT_DAYS = 365;

type Member = SessionUser & { organizationId: string };

/**
 * Writes (or rewrites) the report of a game with its first `played` steps. Called each time the host moves
 * on, so a game stopped half-way still leaves its results once the game itself is purged.
 */
export async function saveReport(code: string, played: number, finished: boolean) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { players: { where: { kicked: false }, select: { id: true, name: true, team: true } } },
  });
  if (!room) return;
  const answers = await prisma.answer.findMany({
    where: { code, owner: { kicked: false } },
    select: { player: true, question: true, points: true, payload: true, choice: true, correctness: true },
  });
  const quiz = normalizeQuiz(room.quiz as unknown as Quiz);
  const data = buildReport(
    quiz.questions,
    played,
    room.players,
    answers.map((a) => ({
      ...a,
      payload: (a.payload ? JSON.parse(a.payload) : { choices: [a.choice] }) as AnswerPayload,
    })),
    room.teams,
  );
  // Linked only to a member account (a super-admin viewing the organisation is not one).
  const qa = await keptQuestions(code);
  if (qa.length) data.qa = qa;
  const host = await prisma.user.findFirst({
    where: { id: room.host, organizationId: room.organizationId },
    select: { id: true },
  });
  const id = `${code}-${room.created}`;
  const fields = {
    title: quiz.title,
    finished,
    players: room.players.length,
    data: data as unknown as Prisma.InputJsonValue,
  };
  await prisma.gameReport.upsert({
    where: { id },
    create: {
      id,
      organizationId: room.organizationId,
      quizId: quiz.id,
      hostId: host?.id ?? null,
      playedAt: new Date(Number(room.created)),
      ...fields,
    },
    update: fields,
  });
}

const hostName = (host: { name: string } | null) => host?.name ?? "un ancien membre";

const canDelete = (user: Member, hostId: string | null) =>
  user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN" || hostId === user.id;

/** The organisation's reports, newest first, without their details. */
export async function listReports(user: Member) {
  const rows = await prisma.gameReport.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { playedAt: "desc" },
    select: {
      id: true,
      title: true,
      hostId: true,
      host: { select: { name: true } },
      playedAt: true,
      finished: true,
      players: true,
      data: true,
    },
    take: 500,
  });
  return rows.map(({ data, hostId, host, ...r }) => {
    const d = data as unknown as ReportData;
    return {
      ...r,
      hostName: hostName(host),
      playedAt: r.playedAt.toISOString(),
      questions: d.questions.length,
      total: d.total,
      mine: hostId === user.id,
    };
  });
}
export type ReportSummary = Awaited<ReturnType<typeof listReports>>[number];

export async function findReport(user: Member, id: unknown) {
  if (typeof id !== "string" || id.length > 80) return null;
  const row = await prisma.gameReport.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { host: { select: { name: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    hostName: hostName(row.host),
    playedAt: row.playedAt,
    finished: row.finished,
    players: row.players,
    data: row.data as unknown as ReportData,
    canDelete: canDelete(user, row.hostId),
  };
}

export async function deleteReport(user: Member, id: unknown) {
  const report = await findReport(user, id);
  if (!report) fail("Résultats introuvables.", 404);
  if (!report.canDelete)
    fail("Seuls l’animateur de la partie et les administrateurs peuvent les supprimer.", 403);
  await prisma.gameReport.delete({ where: { id: report.id } });
}
