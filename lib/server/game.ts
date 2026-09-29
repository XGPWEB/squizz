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
export const MAX_PLAYERS = 100;
const MAX_NAME = 24;

type Room = {
  code: string;
  host: string;
  quiz: string;
  phase: "lobby" | "question" | "finished";
  question: number;
  started: number;
  created: number;
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

/** Removes games older than ROOM_TTL together with their players and answers. */
export async function purgeExpiredRooms(db: D1Database) {
  const cutoff = Date.now() - ROOM_TTL;
  const expired = "(SELECT code FROM rooms WHERE created < ?)";
  await db.batch([
    db.prepare(`DELETE FROM answers WHERE code IN ${expired}`).bind(cutoff),
    db.prepare(`DELETE FROM players WHERE code IN ${expired}`).bind(cutoff),
    db.prepare("DELETE FROM rooms WHERE created < ?").bind(cutoff),
  ]);
}

export async function createRoom(db: D1Database, host: string, quiz: Quiz): Promise<string> {
  await purgeExpiredRooms(db);
  const snapshot = JSON.stringify(shufflePuzzles(normalizeQuiz(quiz)));
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(100000 + (randomInt() % 900000));
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO rooms (code,host,quiz,phase,question,started,created) VALUES (?,?,?,'lobby',0,0,?)",
      )
      .bind(code, host, snapshot, Date.now())
      .run();
    if (result.meta.changes) return code;
  }
  fail("Impossible de créer la partie. Réessaie.", 503);
}

export function parseCode(value: unknown): string {
  const code = String(value || "");
  if (!/^\d{6}$/.test(code)) fail("Le code doit contenir 6 chiffres.");
  return code;
}

async function loadRoom(db: D1Database, code: string): Promise<Room> {
  const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<Room>();
  if (!room || Date.now() - room.created > ROOM_TTL) fail("Cette partie est introuvable ou a expiré.", 404);
  return room;
}

export async function joinRoom(db: D1Database, who: string, code: string, rawName: unknown) {
  const room = await loadRoom(db, code);
  const name = String(rawName || "").trim();
  if (name.length < 1 || name.length > MAX_NAME) fail(`Choisis un pseudo de 1 à ${MAX_NAME} caractères.`);
  const exists = await db.prepare("SELECT id FROM players WHERE code = ? AND id = ?").bind(code, who).first();
  if (exists) return;
  if (room.phase !== "lobby") fail("La partie a déjà commencé.");
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO players(code,id,name) SELECT ?,?,?
       WHERE EXISTS (SELECT 1 FROM rooms WHERE code = ? AND phase = 'lobby')
       AND (SELECT COUNT(*) FROM players WHERE code = ?) < ?`,
    )
    .bind(code, who, name, code, code, MAX_PLAYERS)
    .run();
  if (!result.meta.changes) fail("Ce pseudo est déjà utilisé, la partie est pleine ou elle a commencé.");
}

/** Everything the in-game actions need to know about a room, as seen by one visitor. */
type GameContext = {
  db: D1Database;
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

export async function loadGame(db: D1Database, who: string, code: string): Promise<GameContext> {
  const room = await loadRoom(db, code);
  const quiz = normalizeQuiz(JSON.parse(room.quiz));
  const question = quiz.questions[room.question];
  const duration = question.duration * 1000;
  const host = room.host === who;
  const [scores, answers] = await db.batch([
    db
      .prepare(
        `SELECT p.id, p.name,
           COALESCE(SUM(a.points),0) AS score,
           COALESCE(SUM(CASE WHEN a.question < ? THEN a.points ELSE 0 END),0) AS priorScore,
           COALESCE(SUM(CASE WHEN COALESCE(a.correctness, CASE WHEN a.points > 0 THEN 1 ELSE 0 END) = 1
             THEN 1 ELSE 0 END),0) AS correctCount
         FROM players p LEFT JOIN answers a ON a.code = p.code AND a.player = p.id
         WHERE p.code = ? GROUP BY p.id, p.name ORDER BY score DESC, p.name ASC`,
      )
      .bind(room.question, code),
    db
      .prepare("SELECT player,choice,points,payload,correctness FROM answers WHERE code = ? AND question = ?")
      .bind(code, room.question),
  ]);
  const people = scores.results as ScoreRow[];
  const submitted = answers.results as AnswerRow[];
  const me = people.find((p) => p.id === who);
  if (!host && !me) fail("Rejoins d’abord cette partie.", 403);
  const revealed =
    room.phase !== "lobby" &&
    (room.phase === "finished" ||
      question.type === "slide" ||
      Date.now() >= room.started + duration ||
      (people.length > 0 && submitted.length >= people.length));
  return { db, who, room, quiz, question, duration, host, people, me, submitted, revealed };
}

export async function submitAnswer(g: GameContext, body: Body) {
  const { db, room, question, duration } = g;
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
  const r = await db
    .prepare(
      `INSERT OR IGNORE INTO answers(code,player,question,choice,points,payload,correctness)
       SELECT ?,?,?,?,?,?,? WHERE EXISTS
         (SELECT 1 FROM rooms WHERE code = ? AND phase = 'question' AND question = ? AND started > ?)`,
    )
    .bind(
      room.code,
      g.who,
      room.question,
      result.payload.choices?.[0] ?? -1,
      points,
      JSON.stringify(result.payload),
      result.correct === null ? -1 : result.correct ? 1 : 0,
      room.code,
      room.question,
      Date.now() - duration,
    )
    .run();
  if (!r.meta.changes) fail("Réponse déjà envoyée ou temps écoulé.");
}

function requireHost(g: GameContext) {
  if (!g.host) fail("Seul l’animateur peut piloter la partie.", 403);
}

export async function startGame(g: GameContext) {
  requireHost(g);
  if (g.room.phase !== "lobby" || !g.people.length) fail("Attends au moins un joueur.");
  await g.db
    .prepare("UPDATE rooms SET phase='question',started=? WHERE code=? AND phase='lobby'")
    .bind(Date.now(), g.room.code)
    .run();
}

export async function nextQuestion(g: GameContext, body: Body) {
  requireHost(g);
  const { room } = g;
  if (room.phase !== "question" || !g.revealed || body.question !== room.question)
    fail("Attends la fin de cette question.");
  const last = room.question + 1 >= g.quiz.questions.length;
  await g.db
    .prepare("UPDATE rooms SET phase=?,question=?,started=? WHERE code=? AND phase='question' AND question=?")
    .bind(
      last ? "finished" : "question",
      last ? room.question : room.question + 1,
      Date.now(),
      room.code,
      room.question,
    )
    .run();
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
