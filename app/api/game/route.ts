import { rankPlayers, type ScoreRow } from "@/lib/game-results";
import { rawDb } from "@/db";
import { demos, type Quiz } from "@/lib/quizzes";
import { identity, identityHeaders } from "@/lib/identity";
import {
  validateQuestion,
  normalizeQuestion,
  evaluateAnswer,
  publicQuestion,
  aggregateAnswers,
  isScored,
  type AnswerPayload,
} from "@/lib/question";
export const dynamic = "force-dynamic";
type Room = {
  code: string;
  host: string;
  quiz: string;
  phase: string;
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
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
function decode(a: AnswerRow): AnswerPayload {
  return a.payload ? JSON.parse(a.payload) : { choices: [a.choice] };
}
function quizData(raw: Quiz): Quiz {
  return { ...raw, questions: raw.questions.map(normalizeQuestion) };
}
async function handle(req: Request) {
  const who = identity(req);
  const reply = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: identityHeaders(req, who) });
  try {
    const db = rawDb();
    let body: any;
    try {
      body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    } catch {
      fail("Requête invalide.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Requête invalide.");
    const action = body.action || "list";
    if (action === "list") {
      const custom = await db
        .prepare("SELECT data FROM quizzes WHERE owner = ?")
        .bind(who.id)
        .all<{ data: string }>();
      return reply({ quizzes: [...demos, ...custom.results.map((x) => quizData(JSON.parse(x.data)))] });
    }
    if (req.method !== "POST" && action !== "state") fail("Méthode non autorisée.", 405);
    if (action === "save") {
      const v = body.quiz;
      if (
        !v ||
        typeof v.title !== "string" ||
        !v.title.trim() ||
        v.title.length > 90 ||
        !Array.isArray(v.questions) ||
        v.questions.length < 1 ||
        v.questions.length > 30
      )
        fail("Ajoute un titre et de 1 à 30 questions.");
      let questions;
      try {
        questions = v.questions.map(validateQuestion);
      } catch (e) {
        fail((e as Error).message);
      }
      const quiz: Quiz = {
        id: crypto.randomUUID(),
        title: v.title.trim(),
        questions,
        tag: "VOTRE CRÉATION",
        symbol: "✦",
        color: "purple",
        desc: `${questions.length} étapes à partager.`,
      };
      await db
        .prepare("INSERT INTO quizzes (id,owner,data) VALUES (?,?,?)")
        .bind(quiz.id, who.id, JSON.stringify(quiz))
        .run();
      return reply({ quiz });
    }
    if (action === "create") {
      let quiz = demos.find((q) => q.id === body.quizId);
      if (!quiz) {
        const row = await db
          .prepare("SELECT data FROM quizzes WHERE id = ? AND owner = ?")
          .bind(String(body.quizId), who.id)
          .first<{ data: string }>();
        if (row) quiz = quizData(JSON.parse(row.data));
      }
      if (!quiz) fail("Quiz introuvable.", 404);
      // Shuffle puzzle storage for the game so array order does not expose the solution.
      const snapshot = quizData(quiz);
      snapshot.questions = snapshot.questions.map((q) => {
        if (q.type !== "puzzle") return q;
        const shuffled = q.options
          .map((_, i) => ({ i, key: crypto.getRandomValues(new Uint32Array(1))[0] }))
          .sort((a, b) => a.key - b.key)
          .map((x) => x.i);
        return {
          ...q,
          options: shuffled.map((i) => q.options[i]),
          order: q.order.map((i) => shuffled.indexOf(i)),
        };
      });
      for (let attempt = 0; attempt < 8; attempt++) {
        const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
        const result = await db
          .prepare(
            "INSERT OR IGNORE INTO rooms (code,host,quiz,phase,question,started,created) VALUES (?,?,?,'lobby',0,0,?)",
          )
          .bind(code, who.id, JSON.stringify(snapshot), Date.now())
          .run();
        if (result.meta.changes) return reply({ code });
      }
      fail("Impossible de créer la partie. Réessaie.", 503);
    }
    const code = String(body.code || "");
    if (!/^\d{6}$/.test(code)) fail("Le code doit contenir 6 chiffres.");
    const room = await db.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first<Room>();
    if (!room || Date.now() - room.created > 86400000) fail("Cette partie est introuvable ou a expiré.", 404);
    const quiz = quizData(JSON.parse(room.quiz));
    const host = room.host === who.id;
    const question = quiz.questions[room.question];
    const duration = question.duration * 1000;
    if (action === "join") {
      const name = String(body.name || "").trim();
      if (name.length < 1 || name.length > 24) fail("Choisis un pseudo de 1 à 24 caractères.");
      const exists = await db
        .prepare("SELECT id FROM players WHERE code = ? AND id = ?")
        .bind(code, who.id)
        .first();
      if (exists) return reply({ code });
      if (room.phase !== "lobby") fail("La partie a déjà commencé.");
      const result = await db
        .prepare(
          "INSERT OR IGNORE INTO players(code,id,name) SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE code = ? AND phase = 'lobby') AND (SELECT COUNT(*) FROM players WHERE code = ?) < 100",
        )
        .bind(code, who.id, name, code, code)
        .run();
      if (!result.meta.changes) fail("Ce pseudo est déjà utilisé, la partie est pleine ou elle a commencé.");
      return reply({ code });
    }
    const people = (
      await db
        .prepare(
          `SELECT p.id,p.name,COALESCE(SUM(a.points),0) AS score,
   COALESCE(SUM(CASE WHEN a.question < ? THEN a.points ELSE 0 END),0) AS priorScore,
   COALESCE(SUM(CASE WHEN COALESCE(a.correctness,CASE WHEN a.points > 0 THEN 1 ELSE 0 END)=1 THEN 1 ELSE 0 END),0) AS correctCount
   FROM players p LEFT JOIN answers a ON a.code=p.code AND a.player=p.id WHERE p.code = ? GROUP BY p.id,p.name ORDER BY score DESC,p.name ASC`,
        )
        .bind(room.question, code)
        .all<ScoreRow>()
    ).results;
    const me = people.find((p) => p.id === who.id);
    if (!host && !me) fail("Rejoins d’abord cette partie.", 403);
    const submitted = (
      await db
        .prepare(
          "SELECT player,choice,points,payload,correctness FROM answers WHERE code = ? AND question = ?",
        )
        .bind(code, room.question)
        .all<AnswerRow>()
    ).results;
    const revealed =
      room.phase !== "lobby" &&
      (room.phase === "finished" ||
        question.type === "slide" ||
        Date.now() >= room.started + duration ||
        (people.length > 0 && submitted.length >= people.length));
    if (action === "answer") {
      if (!me) fail("Rejoins la partie pour répondre.", 403);
      if (question.type === "slide") fail("Cette diapo ne demande pas de réponse.");
      if (room.phase !== "question" || revealed) fail("Le temps est écoulé.");
      if (body.question !== room.question) fail("Cette question est terminée.");
      let result;
      try {
        result = evaluateAnswer(question, body.answer ?? { choices: [body.choice] });
      } catch (e) {
        fail((e as Error).message);
      }
      const points =
        result.correct && question.points !== "none"
          ? Math.round(500 + 500 * Math.max(0, 1 - (Date.now() - room.started) / duration)) *
            (question.points === "double" ? 2 : 1)
          : 0;
      const r = await db
        .prepare(
          `INSERT OR IGNORE INTO answers(code,player,question,choice,points,payload,correctness)
    SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM rooms WHERE code = ? AND phase = 'question' AND question = ? AND started > ?)`,
        )
        .bind(
          code,
          who.id,
          room.question,
          result.payload.choices?.[0] ?? -1,
          points,
          JSON.stringify(result.payload),
          result.correct === null ? -1 : result.correct ? 1 : 0,
          code,
          room.question,
          Date.now() - duration,
        )
        .run();
      if (!r.meta.changes) fail("Réponse déjà envoyée ou temps écoulé.");
      return reply({ accepted: true });
    }
    if (action === "start" || action === "next") {
      if (!host) fail("Seul l’animateur peut piloter la partie.", 403);
      if (action === "start") {
        if (room.phase !== "lobby" || !people.length) fail("Attends au moins un joueur.");
        await db
          .prepare("UPDATE rooms SET phase='question',started=? WHERE code=? AND phase='lobby'")
          .bind(Date.now(), code)
          .run();
      } else {
        if (room.phase !== "question" || !revealed || body.question !== room.question)
          fail("Attends la fin de cette question.");
        const last = room.question + 1 >= quiz.questions.length;
        await db
          .prepare(
            "UPDATE rooms SET phase=?,question=?,started=? WHERE code=? AND phase='question' AND question=?",
          )
          .bind(
            last ? "finished" : "question",
            last ? room.question : room.question + 1,
            Date.now(),
            code,
            room.question,
          )
          .run();
      }
      return reply({ ok: true });
    }
    if (action !== "state") fail("Action inconnue.");
    const myAnswer = submitted.find((a) => a.player === who.id);
    const ranked = rankPlayers(people, who.id, revealed, room.question);
    const personal = ranked.find((p) => p.me);
    const correctness = myAnswer ? (myAnswer.correctness ?? (myAnswer.points > 0 ? 1 : 0)) : null;
    return reply({
      code,
      host,
      title: quiz.title,
      phase: room.phase,
      index: room.question,
      total: quiz.questions.length,
      totalScored: quiz.questions.filter((q) => isScored(q.type)).length,
      duration: question.duration,
      remaining: Math.max(0, room.started + duration - Date.now()),
      revealed,
      question: room.phase === "lobby" ? null : publicQuestion(question, revealed, room.question),
      players: ranked,
      personal:
        personal && revealed
          ? {
              ...personal,
              points: myAnswer?.points ?? 0,
              outcome:
                question.type === "slide"
                  ? "slide"
                  : myAnswer
                    ? correctness === -1
                      ? "opinion"
                      : correctness === 1
                        ? "correct"
                        : "incorrect"
                    : "timeout",
            }
          : null,
      answered: submitted.length,
      myAnswer: myAnswer
        ? {
            choice: myAnswer.choice,
            answer: decode(myAnswer),
            ...(revealed ? { points: myAnswer.points } : {}),
          }
        : null,
      aggregate:
        revealed && question.type !== "slide" ? aggregateAnswers(question, submitted.map(decode)) : null,
    });
  } catch (error) {
    const e = error as Error & { status?: number };
    if (!e.status) console.error(e);
    return reply(
      { error: e.status ? e.message : "Une erreur empêche cette action. Réessaie dans un instant." },
      e.status || 503,
    );
  }
}
export const GET = handle;
export const POST = handle;
