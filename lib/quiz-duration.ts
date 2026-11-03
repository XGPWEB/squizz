import { asksNothing, type Question } from "@/lib/question";

/** « Prêt ? » countdown before each step (READY_MS in lib/server/game.ts). */
const READY_S = 2;
/** Rough time to show the answers and the ranking after a question. */
const RESULTS_S = 20;
/** Rough reading time of a slide (the host moves on by hand). */
const SLIDE_S = 20;

/**
 * Estimated length of a game, from each step's real settings: countdown + answer time + results for a
 * question, reading time for a slide. Indicative only: the host sets the pace.
 */
export function estimateSeconds(questions: Pick<Question, "type" | "duration">[]) {
  return questions.reduce(
    (total, q) => total + READY_S + (asksNothing(q.type) ? SLIDE_S : q.duration + RESULTS_S),
    0,
  );
}

/** « ~ 4 min », at least one minute. */
export const estimateLabel = (questions: Pick<Question, "type" | "duration">[]) =>
  `~ ${Math.max(1, Math.round(estimateSeconds(questions) / 60))} min`;
