import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rankPlayers, type ScoreRow } from "@/lib/game-results";
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
    const shuffled = q.options
      .map((_, i) => ({ i, key: randomInt() }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.i);
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
): Promise<string> {
  await purgeExpiredRooms();
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
        },
      });
      return code;
    } catch (e) {
      // A code collision is retried; anything else is a real error.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  fail("Impossible de créer la partie. Réessaie.", 503);
}

export function parseCode(value: unknown): string {
  const code = String(value || "");
  if (!/^\d{6}$/.test(code)) fail("Le code doit contenir 6 chiffres.");
  return code;
}

async function loadRoom(code: string): Promise<Room> {
  const row = await prisma.room.findUnique({ where: { code } });
  if (!row || Date.now() - Number(row.created) > ROOM_TTL)
    fail("Cette partie est introuvable ou a expiré.", 404);
  return {
    ...row,
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
  if (exists) return;
  if (room.phase !== "lobby") fail("La partie a déjà commencé.");
  // One statement re-checks the phase and the player cap atomically with the insert.
  const inserted = await prisma.$executeRaw`
    INSERT INTO "Player" ("code", "id", "name")
    SELECT ${code}, ${who}, ${name}
    WHERE EXISTS (SELECT 1 FROM "Room" WHERE "code" = ${code} AND "phase" = 'lobby')
      AND (SELECT COUNT(*) FROM "Player" WHERE "code" = ${code}) < ${room.maxPlayers}
    ON CONFLICT DO NOTHING`;
  if (!inserted) fail("Ce pseudo est déjà utilisé, la partie est pleine ou elle a commencé.");
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

export async function loadGame(who: string, code: string): Promise<GameContext> {
  const room = await loadRoom(code);
  const quiz = room.quiz;
  const question = quiz.questions[room.question];
  const duration = question.duration * 1000;
  const host = room.host === who;
  const [scores, submitted] = await Promise.all([
    prisma.$queryRaw<ScoreRow[]>`
      SELECT p."id", p."name",
        COALESCE(SUM(a."points"), 0)::int AS "score",
        COALESCE(SUM(CASE WHEN a."question" < ${room.question} THEN a."points" ELSE 0 END), 0)::int AS "priorScore",
        COALESCE(SUM(CASE WHEN COALESCE(a."correctness", CASE WHEN a."points" > 0 THEN 1 ELSE 0 END) = 1
          THEN 1 ELSE 0 END), 0)::int AS "correctCount"
      FROM "Player" p LEFT JOIN "Answer" a ON a."code" = p."code" AND a."player" = p."id"
      WHERE p."code" = ${code}
      GROUP BY p."id", p."name"
      ORDER BY "score" DESC, p."name" ASC`,
    prisma.answer.findMany({
      where: { code, question: room.question },
      select: { player: true, choice: true, points: true, payload: true, correctness: true },
    }),
  ]);
  const people = scores;
  const me = people.find((p) => p.id === who);
  if (!host && !me) fail("Rejoins d’abord cette partie.", 403);
  const revealed =
    room.phase !== "lobby" &&
    (room.phase === "finished" ||
      question.type === "slide" ||
      Date.now() >= room.started + duration ||
      (people.length > 0 && submitted.length >= people.length));
  return { who, room, quiz, question, duration, host, people, me, submitted, revealed };
}

export async function submitAnswer(g: GameContext, body: Body) {
  const { room, question, duration } = g;
  if (!g.me) fail("Rejoins la partie pour répondre.", 403);
  if (question.type === "slide") fail("Cette diapo ne demande pas de réponse.");
  if (room.phase !== "question" || g.revealed) fail("Le temps est écoulé.");
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
      AND "question" = ${room.question} AND "started" > ${BigInt(Date.now() - duration)})
    ON CONFLICT DO NOTHING`;
  if (!inserted) fail("Réponse déjà envoyée ou temps écoulé.");
}

function requireHost(g: GameContext) {
  if (!g.host) fail("Seul l’animateur peut piloter la partie.", 403);
}

export async function startGame(g: GameContext) {
  requireHost(g);
  if (g.room.phase !== "lobby" || !g.people.length) fail("Attends au moins un joueur.");
  await prisma.room.updateMany({
    where: { code: g.room.code, phase: "lobby" },
    data: { phase: "question", started: BigInt(Date.now()) },
  });
}

export async function nextQuestion(g: GameContext, body: Body) {
  requireHost(g);
  const { room } = g;
  if (room.phase !== "question" || !g.revealed || body.question !== room.question)
    fail("Attends la fin de cette question.");
  const last = room.question + 1 >= g.quiz.questions.length;
  await prisma.room.updateMany({
    where: { code: room.code, phase: "question", question: room.question },
    data: {
      phase: last ? "finished" : "question",
      question: last ? room.question : room.question + 1,
      started: BigInt(Date.now()),
    },
  });
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
  return {
    code: room.code,
    host: g.host,
    title: quiz.title,
    phase: room.phase,
    index: room.question,
    total: quiz.questions.length,
    totalScored: quiz.questions.filter((q) => isScored(q.type)).length,
    duration: question.duration,
    remaining: Math.max(0, room.started + g.duration - Date.now()),
    revealed,
    maxPlayers: room.maxPlayers,
    question: room.phase === "lobby" ? null : publicQuestion(question, revealed, room.question),
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
