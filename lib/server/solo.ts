import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { brandOf, DEFAULT_BRAND, type Brand } from "@/lib/brand";
import { orgLimits } from "@/lib/plans";
import type { Quiz } from "@/lib/quizzes";
import {
  aggregateAnswers,
  asksNothing,
  evaluateAnswer,
  isScored,
  isSoundtrack,
  publicQuestion,
  type AnswerPayload,
} from "@/lib/question";
import { buildReport } from "@/lib/report";
import { fail, validated, type Body } from "./http";
import type { SessionUser } from "./guard";
import { normalizeQuiz } from "./quiz-store";
import { prepareQuiz } from "./game";

/** How long a self-paced link stays open, in days (the host chooses). */
export const SOLO_DAYS = [1, 7, 30] as const;
const MAX_NAME = 24;
/** A late answer still counts within this margin (network), as in a live game. */
const GRACE_MS = 2000;

type Member = SessionUser & { organizationId: string; organization: Parameters<typeof orgLimits>[0] };
type Stored = { question: number; payload: AnswerPayload; points: number; correctness: number };

const newId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 14);

/** The quiz of a self-paced link: nothing in it needs a host (the wheel of fortune is left out). */
const soloQuiz = (quiz: Quiz) => {
  const snapshot = prepareQuiz(normalizeQuiz(quiz));
  return { ...snapshot, questions: snapshot.questions.filter((q) => q.type !== "wheel") };
};

/** Opens a self-paced link for a quiz of the organisation. */
export async function createSolo(user: Member, quiz: Quiz, days: unknown, brand: Brand) {
  const span = Number(days);
  if (!SOLO_DAYS.includes(span as (typeof SOLO_DAYS)[number])) fail("Durée invalide.");
  const snapshot = soloQuiz(quiz);
  if (!snapshot.questions.length) fail("Ce quiz n’a pas d’étape à jouer seul.");
  const id = newId();
  await prisma.soloSession.create({
    data: {
      id,
      organizationId: user.organizationId,
      hostId: user.id,
      title: quiz.title,
      quiz: snapshot as unknown as Prisma.InputJsonValue,
      brand: brand as unknown as Prisma.InputJsonValue,
      maxPlayers: orgLimits(user.organization).maxPlayersPerGame,
      expiresAt: new Date(Date.now() + span * 86400_000),
    },
  });
  return id;
}

/** « Replay at your own pace » after a live game: the same quiz, open 7 days, linked from the game. */
export async function createReplay(code: string, host: string) {
  const room = await prisma.room.findUnique({
    where: { code },
    include: { organization: true },
  });
  if (!room || room.host !== host) fail("Seul l’animateur peut ouvrir le replay.", 403);
  if (room.replayId) return room.replayId;
  const user = { id: host, organizationId: room.organizationId, organization: room.organization } as Member;
  const id = await createSolo(
    user,
    room.quiz as unknown as Quiz,
    7,
    (room.brand as Brand | null) ?? brandOf(room.organization),
  );
  await prisma.room.updateMany({ where: { code, replayId: null }, data: { replayId: id } });
  return (await prisma.room.findUnique({ where: { code }, select: { replayId: true } }))!.replayId!;
}

async function openSession(id: unknown) {
  if (typeof id !== "string" || !/^[a-z0-9]{8,20}$/.test(id)) fail("Lien introuvable.", 404);
  const session = await prisma.soloSession.findUnique({ where: { id } });
  if (!session) fail("Ce lien n’existe pas ou a été supprimé.", 404);
  return { ...session, quiz: normalizeQuiz(session.quiz as unknown as Quiz) };
}
const isOpen = (s: { expiresAt: Date; closedAt: Date | null }) => !s.closedAt && s.expiresAt > new Date();
const requireOpen = (s: Parameters<typeof isOpen>[0]) => {
  if (!isOpen(s)) fail("Ce quiz en autonomie est fermé.");
};

export async function soloJoin(who: string, id: unknown, rawName: unknown) {
  const session = await openSession(id);
  requireOpen(session);
  const name = String(rawName || "").trim();
  if (name.length < 1 || name.length > MAX_NAME) fail(`Choisis un pseudo de 1 à ${MAX_NAME} caractères.`);
  const mine = await prisma.soloRun.findUnique({
    where: { sessionId_player: { sessionId: session.id, player: who } },
  });
  if (mine) return;
  const count = await prisma.soloRun.count({ where: { sessionId: session.id } });
  if (count >= session.maxPlayers) fail("Ce quiz a atteint son nombre maximal de participants.");
  try {
    await prisma.soloRun.create({
      data: { sessionId: session.id, player: who, name, startedAt: BigInt(Date.now()) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      fail("Ce pseudo est déjà pris pour ce quiz : choisis-en un autre.");
    throw e;
  }
}

const runOf = (sessionId: string, who: string) =>
  prisma.soloRun.findUnique({ where: { sessionId_player: { sessionId, player: who } } });

/** What a participant sees: the current step (its correction once answered), or their final result. */
export async function soloState(who: string, id: unknown) {
  const session = await openSession(id);
  const run = await runOf(session.id, who);
  const base = {
    title: session.title,
    brand: (session.brand as Brand | null) ?? DEFAULT_BRAND,
    total: session.quiz.questions.length,
    totalScored: session.quiz.questions.filter((q) => isScored(q.type)).length,
    open: isOpen(session),
    expiresAt: session.expiresAt.toISOString(),
  };
  if (!run) return { ...base, phase: "join" as const };
  const answers = run.answers as unknown as Stored[];
  if (run.finishedAt || run.index >= session.quiz.questions.length) {
    const finished = await prisma.soloRun.findMany({
      where: { sessionId: session.id, finishedAt: { not: null } },
      select: { score: true },
    });
    return {
      ...base,
      phase: "finished" as const,
      name: run.name,
      score: run.score,
      correct: answers.filter((a) => a.correctness === 1).length,
      rank: finished.filter((r) => r.score > run.score).length + 1,
      players: finished.length,
    };
  }
  if (!base.open) return { ...base, phase: "join" as const };
  const question = session.quiz.questions[run.index];
  const mine = answers.find((a) => a.question === run.index);
  const duration = question.duration * 1000;
  const elapsed = Date.now() - Number(run.startedAt);
  const timedOut = !asksNothing(question.type) && !mine && elapsed > duration + GRACE_MS;
  const revealed = !!mine || timedOut || asksNothing(question.type);
  const visible = publicQuestion(question, revealed, run.index, true);
  if (question.type === "blindtest" && !revealed) {
    // Play the extract without sending its caption or unrelated pictures that give the answer away.
    visible.media = visible.media
      .filter(isSoundtrack)
      .slice(0, 1)
      .map((m) => ({ ...m, caption: "" }));
  }
  return {
    ...base,
    phase: "question" as const,
    name: run.name,
    index: run.index,
    score: run.score,
    duration: question.duration,
    remaining: revealed ? 0 : Math.max(0, duration - elapsed),
    revealed,
    question: visible,
    myAnswer: mine ? { answer: mine.payload, points: mine.points, outcome: outcomeOf(mine) } : null,
    timedOut,
    // The group's answers so far, once this player has seen the correction (opinions in particular).
    aggregate:
      revealed && !asksNothing(question.type) ? await groupAnswers(session.id, run.index, question) : null,
  };
}
const outcomeOf = (a: Stored) =>
  a.correctness === -1 ? "opinion" : a.correctness === 1 ? "correct" : "incorrect";

async function groupAnswers(
  sessionId: string,
  index: number,
  question: Parameters<typeof aggregateAnswers>[0],
) {
  const runs = await prisma.soloRun.findMany({ where: { sessionId }, select: { answers: true } });
  const payloads = runs.flatMap((r) =>
    (r.answers as unknown as Stored[]).filter((a) => a.question === index).map((a) => a.payload),
  );
  return aggregateAnswers(question, payloads);
}

export async function soloAnswer(who: string, id: unknown, body: Body) {
  const session = await openSession(id);
  requireOpen(session);
  const run = await runOf(session.id, who);
  if (!run) fail("Choisis d’abord un pseudo.", 403);
  if (body.question !== run.index) return; // an answer sent again after moving on
  const question = session.quiz.questions[run.index];
  if (!question || asksNothing(question.type)) fail("Cette étape ne demande pas de réponse.");
  const answers = run.answers as unknown as Stored[];
  if (answers.some((a) => a.question === run.index)) return; // the first answer counts
  const duration = question.duration * 1000;
  const elapsed = Date.now() - Number(run.startedAt);
  if (elapsed > duration + GRACE_MS) fail("Le temps est écoulé pour cette question.");
  const result = validated(() => evaluateAnswer(question, body.answer));
  const speed = Math.max(0, 1 - Math.min(elapsed, duration) / duration);
  const points =
    result.correct && question.points !== "none"
      ? Math.round(500 + 500 * speed) * (question.points === "double" ? 2 : 1)
      : 0;
  const entry: Stored = {
    question: run.index,
    payload: result.payload,
    points,
    correctness: result.correct === null ? -1 : result.correct ? 1 : 0,
  };
  // Only if nothing changed meanwhile (an answer sent twice at once counts once).
  const changed = await prisma.soloRun.updateMany({
    where: {
      id: run.id,
      index: run.index,
      answers: { equals: run.answers as Prisma.InputJsonValue },
      session: { closedAt: null, expiresAt: { gt: new Date() } },
    },
    data: {
      answers: [...answers, entry] as unknown as Prisma.InputJsonValue,
      score: { increment: points },
    },
  });
  if (!changed.count) requireOpen(await openSession(session.id));
}

/** The next step (the clock starts now), or the end, which writes the results. */
export async function soloNext(who: string, id: unknown, body: Body) {
  const session = await openSession(id);
  requireOpen(session);
  const run = await runOf(session.id, who);
  if (!run) fail("Choisis d’abord un pseudo.", 403);
  if (body.question !== run.index || run.finishedAt) return; // pressed twice
  const question = session.quiz.questions[run.index];
  const answered = (run.answers as unknown as Stored[]).some((a) => a.question === run.index);
  const over = Date.now() - Number(run.startedAt) > question.duration * 1000 + GRACE_MS;
  if (!asksNothing(question.type) && !answered && !over) fail("Réponds d’abord à cette question.");
  const last = run.index + 1 >= session.quiz.questions.length;
  const changed = await prisma.soloRun.updateMany({
    where: { id: run.id, index: run.index, session: { closedAt: null, expiresAt: { gt: new Date() } } },
    data: {
      index: run.index + 1,
      startedAt: BigInt(Date.now()),
      ...(last ? { finishedAt: new Date() } : {}),
    },
  });
  if (!changed.count) requireOpen(await openSession(session.id));
  if (last && changed.count) await saveSoloReport(session.id);
}

/** The host closes a link early; it can no longer be played (its results stay). */
export async function closeSolo(user: Member, id: unknown) {
  const session = await openSession(id);
  if (session.organizationId !== user.organizationId) fail("Lien introuvable.", 404);
  await prisma.soloSession.update({ where: { id: session.id }, data: { closedAt: new Date() } });
}

/** The results of a self-paced link, as one report with everyone who finished. */
export async function saveSoloReport(sessionId: string) {
  const session = await prisma.soloSession.findUnique({ where: { id: sessionId }, include: { runs: true } });
  if (!session) return;
  const quiz = normalizeQuiz(session.quiz as unknown as Quiz);
  const runs = session.runs.filter((r) => r.finishedAt);
  const data = buildReport(
    quiz.questions,
    quiz.questions.length,
    runs.map((r) => ({ id: r.id, name: r.name })),
    runs.flatMap((r) =>
      (r.answers as unknown as Stored[]).map((a) => ({
        player: r.id,
        question: a.question,
        points: a.points,
        payload: a.payload,
        correctness: a.correctness,
      })),
    ),
  );
  const host = session.hostId
    ? await prisma.user.findFirst({
        where: { id: session.hostId, organizationId: session.organizationId },
        select: { id: true },
      })
    : null;
  const id = `solo-${session.id}`;
  const fields = {
    title: `${session.title} · en autonomie`,
    finished: !isOpen(session),
    players: runs.length,
    data: data as unknown as Prisma.InputJsonValue,
  };
  await prisma.gameReport.upsert({
    where: { id },
    create: {
      id,
      organizationId: session.organizationId,
      quizId: quiz.id,
      hostId: host?.id ?? null,
      playedAt: session.createdAt,
      ...fields,
    },
    update: fields,
  });
}

/** The self-paced links of an organisation, for its results page. */
export async function listSolos(organizationId: string) {
  const rows = await prisma.soloSession.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      expiresAt: true,
      closedAt: true,
      _count: { select: { runs: true } },
    },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    open: isOpen(r),
    players: r._count.runs,
  }));
}
