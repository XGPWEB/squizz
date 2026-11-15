import { espace } from "./originals/espace";
import { welcome } from "./originals/templates";
import { aggregateAnswers, evaluateAnswer, speedPoints, type AnswerPayload, type Question } from "./question";
import { rankPlayers } from "./game-results";

/**
 * The public demo (/demo): a short game played alone in the browser, against fictional players whose
 * answers are computed here. Nothing reaches the server: no room, no player, no result is stored, and the
 * page never calls the AI. The steps are taken as they are from the SQuizz Originals, whose facts and
 * explanations are already checked (lib/originals); a test fails if one of them disappears.
 */
const pick = (steps: Question[], start: string) => {
  const step = steps.find((q) => q.text.startsWith(start));
  if (!step) throw new Error(`Étape de démonstration introuvable : ${start}`);
  return step;
};

export const DEMO_STEPS: Question[] = [
  pick(espace, "La Grande Muraille de Chine"),
  pick(espace, "Quelle planète la sonde Cassini"),
  pick(espace, "À quelle distance moyenne"),
  { ...pick(espace, "Rangez ces planètes"), duration: 30 },
  pick(welcome, "Pour bien démarrer la journée"),
];

/** The fictional players: their names say they are not real, and so does every screen of the demo. */
export const DEMO_BOTS = [
  { id: "bot-0", name: "Comète (fictif)", skill: [1, 1, 0, 1, 0] },
  { id: "bot-1", name: "Pixel (fictif)", skill: [0, 1, 1, 0, 1] },
  { id: "bot-2", name: "Nova (fictive)", skill: [1, 0, 1, 1, 2] },
  { id: "bot-3", name: "Zéphyr (fictif)", skill: [0, 0, 0, 1, 3] },
] as const;
export const DEMO_PLAYER = "me";

/**
 * Shuffles a puzzle as live games do (lib/server/game.ts), with a fixed order: the demo must never show
 * the solution as is, and a reload must not change what the fictional players answered.
 */
export function prepareDemoStep(q: Question): Question {
  if (q.type !== "puzzle") return q;
  const n = q.options.length;
  // A rotation by one followed by a swap: always different from the solution, for any length above 1.
  const shuffled = Array.from({ length: n }, (_, i) => (i + 1) % n);
  if (n > 3) [shuffled[1], shuffled[2]] = [shuffled[2], shuffled[1]];
  return { ...q, options: shuffled.map((i) => q.options[i]), order: q.order.map((i) => shuffled.indexOf(i)) };
}

/** What a fictional player answers: `skill` 1 is right, 0 wrong; for a poll, the option it picks. */
export function botAnswer(q: Question, skill: number): AnswerPayload {
  const right = skill === 1;
  switch (q.type) {
    case "quiz":
    case "truefalse": {
      const wrong = q.options.findIndex((_, i) => !q.correctAnswers.includes(i));
      return { choices: right ? [...q.correctAnswers] : [wrong] };
    }
    case "poll":
      return { choices: [skill % q.options.length] };
    case "slider": {
      const off = right ? q.step : q.tolerance * 3 + q.step;
      const value = Math.min(q.max, Math.max(q.min, q.target + (skill === 0 ? off : -off)));
      return { value: q.min + Math.round((value - q.min) / q.step) * q.step };
    }
    case "puzzle": {
      const order = [...q.order];
      if (!right) [order[0], order[1]] = [order[1], order[0]];
      return { order };
    }
    default:
      throw new Error(`Type non prévu dans la démonstration : ${q.type}`);
  }
}

/** How fast each fictional player answers, as a share of the question's time (fixed, for the same score). */
const BOT_SPEED = [0.35, 0.5, 0.25, 0.65];

export type DemoAnswer = { player: string; payload: AnswerPayload; points: number; correct: boolean | null };

/** Scores an answer with the same rule as live games: the right answer earns 500 to 1 000 points. */
export function scoreDemoAnswer(q: Question, raw: AnswerPayload, elapsedMs: number) {
  const result = evaluateAnswer(q, raw);
  return {
    payload: result.payload,
    correct: result.correct,
    points: speedPoints(q, !!result.correct, elapsedMs),
  };
}

/** The answers of every fictional player to step `index`. */
export function botAnswers(q: Question, index: number): DemoAnswer[] {
  return DEMO_BOTS.map((bot, b) => {
    const scored = scoreDemoAnswer(q, botAnswer(q, bot.skill[index] ?? 0), BOT_SPEED[b] * q.duration * 1000);
    return { player: bot.id, ...scored };
  });
}

/** The figures of the correction screen, with the visitor's answer among the others. */
export const demoAggregate = (q: Question, answers: DemoAnswer[]) =>
  aggregateAnswers(
    q,
    answers.map((a) => a.payload),
  );

/**
 * The ranking after step `index` (all answers given so far, step by step), with the places won or lost
 * as in a live game (lib/game-results.ts).
 */
export function demoRanking(history: DemoAnswer[][], index: number, myName: string) {
  const players = [{ id: DEMO_PLAYER, name: myName }, ...DEMO_BOTS];
  const sum = (id: string, upTo: number) =>
    history
      .slice(0, upTo)
      .reduce((total, step) => total + (step.find((a) => a.player === id)?.points ?? 0), 0);
  const rows = players.map((p) => ({
    id: p.id,
    name: p.name,
    score: sum(p.id, index + 1),
    priorScore: sum(p.id, index),
    correctCount: history
      .slice(0, index + 1)
      .filter((step) => step.find((a) => a.player === p.id)?.correct === true).length,
  }));
  return rankPlayers(rows, DEMO_PLAYER, true, index);
}

/** The visitor's pseudo, as live games accept it: trimmed, 24 characters, never empty. */
export const demoName = (raw: string) => raw.trim().replace(/\s+/g, " ").slice(0, 24) || "Vous";
