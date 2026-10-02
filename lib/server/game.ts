import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rankPlayers, type ScoreRow } from "@/lib/game-results";
import { orgLimits } from "@/lib/plans";
import type { Quiz } from "@/lib/quizzes";
import {
  aggregateAnswers,
  evaluateAnswer,
  isScored,
  publicQuestion,
  type AnswerPayload,
  type Question,
} from "@/lib/question";
import { fail, validated, type Body } from "./http";
import { normalizeQuiz } from "./quiz-store";

export const ROOM_TTL = 24 * 60 * 60 * 1000;
const MAX_NAME = 24;
/** Delay between "Next" and the question appearing, so every phone gets it before the clock runs. */
export const READY_MS = 2000;
/** How long every visitor of a game shares the same database snapshot. */
const SNAPSHOT_MS = 400;

type Room = {
  code: string;
  organizationId: string;
  host: string;
  quiz: Quiz;
  phase: "lobby" | "question" | "finished";
  question: number;
  started: number;
  created: number;
  maxPlayers: number;
};
type AnswerRow = {
  player: string;
  choice: number;
  points: number;
  payload: string;
  correctness: number | null;
};

const decode = (a: AnswerRow): AnswerPayload => (a.payload ? JSON.parse(a.payload) : { choices: [a.choice] });
const randomInt = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** Shuffles puzzle options so the stored order does not expose the solution. */
function shufflePuzzles(quiz: Quiz): Quiz {
  const questions = quiz.questions.map((q) => {
    if (q.type !== "puzzle") return q;
    // Reshuffle until the stored order differs from the solution: players see this order as is.
    let shuffled = q.options.map((_, i) => i);
    for (let attempt = 0; attempt < 20; attempt++) {
      shuffled = q.options
        .map((_, i) => ({ i, key: randomInt() }))
        .sort((a, b) => a.key - b.key)
        .map((x) => x.i);
      if (q.order.some((solutionIndex, position) => shuffled.indexOf(solutionIndex) !== position)) break;
    }
    return {
      ...q,
      options: shuffled.map((i) => q.options[i]),
      order: q.order.map((i) => shuffled.indexOf(i)),
    };
  });
  return { ...quiz, questions };
}

/** Removes games older than ROOM_TTL (players and answers follow by cascade) and expired audit entries. */
export async function purgeExpiredRooms() {
  await prisma.room.deleteMany({ where: { created: { lt: BigInt(Date.now() - ROOM_TTL) } } });
  // The privacy policy promises 12 months for the audit log.
  await prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 86400_000) } } });
}

export async function createRoom(
  host: string,
  organizationId: string,
  quiz: Quiz,
  maxPlayers: number,
  key?: unknown,
): Promise<string> {
  await purgeExpiredRooms();
  // A launch retried after a lost response returns the game created the first time.
  const clientKey = typeof key === "string" && /^[\w-]{8,64}$/.test(key) ? key : null;
  const existing = async () =>
    clientKey
      ? prisma.room.findFirst({ where: { organizationId, clientKey, host }, select: { code: true } })
      : null;
  const done = await existing();
  if (done) return done.code;
  const snapshot = shufflePuzzles(normalizeQuiz(quiz)) as unknown as Prisma.InputJsonValue;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(100000 + (randomInt() % 900000));
    try {
      await prisma.room.create({
        data: {
          code,
          organizationId,
          host,
          quiz: snapshot,
          phase: "lobby",
          question: 0,
          started: BigInt(0),
          created: BigInt(Date.now()),
          maxPlayers,
          clientKey,
        },
      });
      return code;
    } catch (e) {
      // A code collision is retried; anything else is a real error.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      // Two copies of the same launch raced: the other one won.
      const raced = await existing();
      if (raced) return raced.code;
    }
  }
  fail("Impossible de créer la partie. Réessaie.", 503);
}

export function parseCode(value: unknown): string {
  const code = String(value || "");
  if (!/^\d{6}$/.test(code)) fail("Le code doit contenir 6 chiffres.");
  return code;
}

/** A game with what decides its organisation's limits today. */
const findRoom = (code: string) =>
  prisma.room.findUnique({
    where: { code },
    include: { organization: { select: { plan: true, partner: true, eventPassUntil: true } } },
  });

async function loadRoom(code: string): Promise<Room> {
  return toRoom(await findRoom(code));
}

function toRoom(found: Awaited<ReturnType<typeof findRoom>>): Room {
  if (!found || Date.now() - Number(found.created) > ROOM_TTL)
    fail("Cette partie est introuvable ou a expiré.", 404);
  const { organization, ...row } = found;
  return {
    ...row,
    // Never more than the organisation's limit today: a game launched under an event pass or a bigger plan
    // stops taking new players once that is over (those already in keep playing).
    maxPlayers: Math.min(row.maxPlayers, orgLimits(organization).maxPlayersPerGame),
    quiz: normalizeQuiz(row.quiz as unknown as Quiz),
    phase: row.phase as Room["phase"],
    started: Number(row.started),
    created: Number(row.created),
  };
}

export async function joinRoom(who: string, code: string, rawName: unknown) {
  const room = await loadRoom(code);
  const name = String(rawName || "").trim();
  if (name.length < 1 || name.length > MAX_NAME) fail(`Choisis un pseudo de 1 à ${MAX_NAME} caractères.`);
  const exists = await prisma.player.findUnique({ where: { code_id: { code, id: who } } });
  if (exists?.kicked) fail("L’animateur t’a retiré de cette partie.", 403);
  if (exists) return;
  if (room.phase !== "lobby") fail("La partie a déjà commencé.");
  // A per-game lock serialises joins, so simultaneous arrivals can never exceed the cap
  // or slip in after the host has started.
  const inserted = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${code}))`;
    return tx.$executeRaw`
      INSERT INTO "Player" ("code", "id", "name")
      SELECT ${code}, ${who}, ${name}
      WHERE EXISTS (SELECT 1 FROM "Room" WHERE "code" = ${code} AND "phase" = 'lobby')
        AND (SELECT COUNT(*) FROM "Player" WHERE "code" = ${code} AND NOT "kicked") < ${room.maxPlayers}
      ON CONFLICT DO NOTHING`;
  });
  if (!inserted) fail("Ce pseudo est déjà utilisé, la partie est pleine ou elle a commencé.");
  invalidate(code);
}

/** The host removes a player (by nickname, the only thing clients know); they cannot come back. */
export async function kickPlayer(g: GameContext, name: unknown) {
  requireHost(g);
  const target = String(name || "");
  const { count } = await prisma.player.updateMany({
    where: { code: g.room.code, name: target, kicked: false, NOT: { id: g.room.host } },
    data: { kicked: true },
  });
  if (!count) fail("Joueur introuvable.", 404);
  invalidate(g.room.code);
}

type Snapshot = { room: Room; people: ScoreRow[]; submitted: AnswerRow[] };
const snapshots = new Map<string, { at: number; value: Promise<Snapshot> }>();

/** Drops a game's cached snapshot after anything changes it. */
export function invalidate(code: string) {
  snapshots.delete(code);
}

async function readSnapshot(code: string): Promise<Snapshot> {
  const room = toRoom(await findRoom(code));
  const [people, submitted] = await Promise.all([
    prisma.$queryRaw<ScoreRow[]>`
      SELECT p."id", p."name",
        COALESCE(SUM(a."points"), 0)::int AS "score",
        COALESCE(SUM(CASE WHEN a."question" < ${room.question} THEN a."points" ELSE 0 END), 0)::int AS "priorScore",
        COALESCE(SUM(CASE WHEN COALESCE(a."correctness", CASE WHEN a."points" > 0 THEN 1 ELSE 0 END) = 1
          THEN 1 ELSE 0 END), 0)::int AS "correctCount"
      FROM "Player" p LEFT JOIN "Answer" a ON a."code" = p."code" AND a."player" = p."id"
      WHERE p."code" = ${code} AND NOT p."kicked"
      GROUP BY p."id", p."name"
      ORDER BY "score" DESC, p."name" ASC`,
    prisma.answer.findMany({
      where: { code, question: room.question, owner: { kicked: false } },
      select: { player: true, choice: true, points: true, payload: true, correctness: true },
    }),
  ]);
  return { room, people, submitted };
}

/**
 * Up to 100 phones poll the same game every second: they share one snapshot for SNAPSHOT_MS
 * (a single in-flight query per game), which cuts database work by ~30x. Any change invalidates it.
 */
function snapshot(code: string, fresh: boolean): Promise<Snapshot> {
  const now = Date.now();
  const hit = snapshots.get(code);
  if (!fresh && hit && now - hit.at < SNAPSHOT_MS) return hit.value;
  const value = readSnapshot(code);
  snapshots.set(code, { at: now, value });
  value.catch(() => snapshots.delete(code));
  if (snapshots.size > 500)
    for (const [key, entry] of snapshots) if (now - entry.at > SNAPSHOT_MS) snapshots.delete(key);
  return value;
}

/** Everything the in-game actions need to know about a room, as seen by one visitor. */
type GameContext = {
  who: string;
  room: Room;
  quiz: Quiz;
  question: Question;
  duration: number;
  host: boolean;
  people: ScoreRow[];
  me: ScoreRow | undefined;
  submitted: AnswerRow[];
  revealed: boolean;
};

/** `fresh` bypasses the shared snapshot: used by every action that changes the game. */
export async function loadGame(who: string, code: string, fresh = false): Promise<GameContext> {
  const { room, people, submitted } = await snapshot(code, fresh);
  const quiz = room.quiz;
  const question = quiz.questions[room.question];
  const duration = question.duration * 1000;
  const host = room.host === who;
  const me = people.find((p) => p.id === who);
  if (!host && !me) {
    const kicked = await prisma.player.findFirst({
      where: { code, id: who, kicked: true },
      select: { id: true },
    });
    fail(kicked ? "L’animateur t’a retiré de cette partie." : "Rejoins d’abord cette partie.", 403);
  }
  const revealed =
    room.phase !== "lobby" &&
    (room.phase === "finished" ||
      (Date.now() >= room.started &&
        (question.type === "slide" ||
          Date.now() >= room.started + duration ||
          (people.length > 0 && submitted.length >= people.length))));
  return { who, room, quiz, question, duration, host, people, me, submitted, revealed };
}

export async function submitAnswer(g: GameContext, body: Body) {
  const { room, question, duration } = g;
  if (!g.me) fail("Rejoins la partie pour répondre.", 403);
  // The same answer sent twice (retry after a lost response) is not an error: the first one counts.
  if (body.question === room.question && g.submitted.some((a) => a.player === g.who)) return;
  if (question.type === "slide") fail("Cette diapo ne demande pas de réponse.");
  if (room.phase !== "question" || g.revealed) fail("Le temps est écoulé.");
  if (Date.now() < room.started) fail("La question n’a pas encore commencé.");
  if (body.question !== room.question) fail("Cette question est terminée.");
  const result = validated(() => evaluateAnswer(question, body.answer ?? { choices: [body.choice] }));
  const speed = Math.max(0, 1 - (Date.now() - room.started) / duration);
  const points =
    result.correct && question.points !== "none"
      ? Math.round(500 + 500 * speed) * (question.points === "double" ? 2 : 1)
      : 0;
  // The WHERE clause re-checks the phase and deadline atomically with the insert.
  const inserted = await prisma.$executeRaw`
    INSERT INTO "Answer" ("code", "player", "question", "choice", "points", "payload", "correctness")
    SELECT ${room.code}, ${g.who}, ${room.question}, ${result.payload.choices?.[0] ?? -1}, ${points},
      ${JSON.stringify(result.payload)}, ${result.correct === null ? -1 : result.correct ? 1 : 0}
    WHERE EXISTS (SELECT 1 FROM "Room" WHERE "code" = ${room.code} AND "phase" = 'question'
      AND "question" = ${room.question} AND "started" > ${BigInt(Date.now() - duration)}
      AND "started" <= ${BigInt(Date.now())})
    ON CONFLICT DO NOTHING`;
  if (!inserted) fail("Réponse déjà envoyée ou temps écoulé.");
  invalidate(room.code);
}

function requireHost(g: GameContext) {
  if (!g.host) fail("Seul l’animateur peut piloter la partie.", 403);
}

export async function startGame(g: GameContext) {
  requireHost(g);
  // A start sent twice (retry after a lost response): the game is already running, nothing to do.
  if (g.room.phase === "question" && g.room.question === 0) return Math.max(0, g.room.started - Date.now());
  if (g.room.phase !== "lobby") fail("La partie a déjà commencé.");
  if (!g.people.length) fail("Attends au moins un joueur.");
  await prisma.room.updateMany({
    where: { code: g.room.code, phase: "lobby" },
    data: { phase: "question", started: BigInt(Date.now() + READY_MS) },
  });
  invalidate(g.room.code);
  return READY_MS;
}

export async function nextQuestion(g: GameContext, body: Body) {
  requireHost(g);
  const { room } = g;
  // « Next » sent twice for the same question (retry after a lost response): it already moved on.
  const alreadyMoved =
    (room.phase === "question" && body.question === room.question - 1) ||
    (room.phase === "finished" && body.question === room.question);
  if (alreadyMoved) return Math.max(0, room.started - Date.now());
  if (room.phase !== "question" || !g.revealed || body.question !== room.question)
    fail("Attends la fin de cette question.");
  const last = room.question + 1 >= g.quiz.questions.length;
  await prisma.room.updateMany({
    where: { code: room.code, phase: "question", question: room.question },
    data: {
      phase: last ? "finished" : "question",
      question: last ? room.question : room.question + 1,
      started: BigInt(Date.now() + (last ? 0 : READY_MS)),
    },
  });
  invalidate(room.code);
  return last ? 0 : READY_MS;
}

function outcome(question: Question, answer: AnswerRow | undefined) {
  if (question.type === "slide") return "slide";
  if (!answer) return "timeout";
  const correctness = answer.correctness ?? (answer.points > 0 ? 1 : 0);
  return correctness === -1 ? "opinion" : correctness === 1 ? "correct" : "incorrect";
}

/** The game state sent to one visitor; correct answers stay hidden until the reveal. */
export function gameState(g: GameContext) {
  const { room, quiz, question, revealed } = g;
  const myAnswer = g.submitted.find((a) => a.player === g.who);
  const players = rankPlayers(g.people, g.who, revealed, room.question);
  const personal = players.find((p) => p.me);
  // During the "Ready?" countdown the question itself stays on the server.
  const startsIn = room.phase === "question" ? Math.max(0, room.started - Date.now()) : 0;
  return {
    code: room.code,
    host: g.host,
    title: quiz.title,
    phase: room.phase,
    index: room.question,
    total: quiz.questions.length,
    totalScored: quiz.questions.filter((q) => isScored(q.type)).length,
    duration: question.duration,
    remaining: Math.max(0, Math.min(g.duration, room.started + g.duration - Date.now())),
    startsIn,
    revealed,
    maxPlayers: room.maxPlayers,
    question:
      room.phase === "lobby" || startsIn > 0
        ? null
        : publicQuestion(question, revealed, room.question, g.host),
    players,
    personal:
      personal && revealed
        ? { ...personal, points: myAnswer?.points ?? 0, outcome: outcome(question, myAnswer) }
        : null,
    answered: g.submitted.length,
    myAnswer: myAnswer
      ? {
          choice: myAnswer.choice,
          answer: decode(myAnswer),
          ...(revealed ? { points: myAnswer.points } : {}),
        }
      : null,
    aggregate:
      revealed && question.type !== "slide" ? aggregateAnswers(question, g.submitted.map(decode)) : null,
  };
}

/** Games created in the last 24 hours, overall or for one organisation. */
export function recentRooms(organizationId?: string) {
  return prisma.room.count({
    where: { created: { gt: BigInt(Date.now() - ROOM_TTL) }, ...(organizationId ? { organizationId } : {}) },
  });
}
