import {
  aggregateAnswers,
  formatValue,
  isScored,
  questionTypes,
  type AnswerPayload,
  type Question,
} from "./question";

/** One answer of one player, as kept in a game report. */
export type ReportAnswer = { text: string; outcome: "correct" | "incorrect" | "opinion"; points: number };
export type ReportQuestion = {
  /** Position in the quiz (slides included), from 0. */
  index: number;
  type: Question["type"];
  typeLabel: string;
  text: string;
  scored: boolean;
  /** The expected answer, in words ("" for opinions). */
  solution: string;
  responses: number;
  /** Share of the players who answered right, in % (scored questions only). */
  successRate: number | null;
  /** The most chosen options, typed words or values, most frequent first. */
  top: { label: string; count: number }[];
  average: number | null;
  nps: number | null;
};
export type ReportPlayer = {
  name: string;
  rank: number;
  score: number;
  correct: number;
  answered: number;
  /** In the order of `questions`; null when the player did not answer. */
  answers: (ReportAnswer | null)[];
};
export type ReportData = { questions: ReportQuestion[]; players: ReportPlayer[]; total: number };

/** What `buildReport` reads from the database: the answers of the questions played. */
export type RawAnswer = {
  player: string;
  question: number;
  points: number;
  payload: AnswerPayload;
  correctness: number | null;
};

const typeLabel = (type: Question["type"]) => questionTypes.find((t) => t.id === type)?.label ?? type;
const percent = (part: number, whole: number) => (whole ? Math.round((100 * part) / whole) : 0);

/** A player's answer in words, as the host would read it out. */
export function describeAnswer(q: Question, a: AnswerPayload): string {
  if (a.choices) return a.choices.map((i) => q.options[i] ?? "?").join(" + ");
  if (typeof a.text === "string") return a.text;
  if (typeof a.value === "number") return formatValue(a.value, q.unit);
  if (typeof a.x === "number" && typeof a.y === "number")
    return `Pin’s à ${Math.round(a.x * 100)} % de la largeur, ${Math.round(a.y * 100)} % de la hauteur`;
  if (a.order) return a.order.map((i) => q.options[i] ?? "?").join(" → ");
  if (a.ideas) return a.ideas.join(" · ");
  return "";
}

/** The expected answer in words ("" when there is none). */
export function describeSolution(q: Question): string {
  switch (q.type) {
    case "quiz":
    case "truefalse":
      return q.correctAnswers.map((i) => q.options[i]).join(" + ");
    case "text":
    case "blindtest":
      return q.accepted.join(" / ");
    case "slider":
      return q.tolerance
        ? `${formatValue(q.target, q.unit)} (± ${formatValue(q.tolerance)})`
        : formatValue(q.target, q.unit);
    case "pin":
      return "La zone choisie sur l’image";
    case "puzzle":
      return q.order.map((i) => q.options[i]).join(" → ");
    default:
      return "";
  }
}

const outcomeOf = (a: RawAnswer): ReportAnswer["outcome"] => {
  const c = a.correctness ?? (a.points > 0 ? 1 : 0);
  return c === -1 ? "opinion" : c === 1 ? "correct" : "incorrect";
};

/**
 * The results of the first `played` steps of a game: every question with its figures, every player with
 * their rank and answers. Slides are left out (nobody answers them).
 */
export function buildReport(
  steps: Question[],
  played: number,
  players: { id: string; name: string }[],
  answers: RawAnswer[],
): ReportData {
  const kept = steps
    .map((q, index) => ({ q, index }))
    .filter(({ q, index }) => index < played && q.type !== "slide");
  const byKey = new Map(answers.map((a) => [`${a.player}:${a.question}`, a]));
  const questions: ReportQuestion[] = kept.map(({ q, index }) => {
    const given = answers.filter((a) => a.question === index);
    const agg = aggregateAnswers(
      q,
      given.map((a) => a.payload),
    );
    const scored = isScored(q.type);
    const top = (
      agg.counts.some((c) => c.count)
        ? agg.counts
        : agg.texts.length
          ? agg.texts
          : agg.values.map((v) => ({ label: formatValue(v.value, q.unit), count: v.count }))
    )
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return {
      index,
      type: q.type,
      typeLabel: typeLabel(q.type),
      text: q.text,
      scored,
      solution: describeSolution(q),
      responses: given.length,
      // Out of every player: not answering counts as not knowing.
      successRate: scored
        ? percent(given.filter((a) => outcomeOf(a) === "correct").length, players.length)
        : null,
      top,
      average: agg.average,
      nps: agg.nps,
    };
  });
  const rows = players.map((p) => {
    const list = kept.map(({ q, index }) => {
      const a = byKey.get(`${p.id}:${index}`);
      return a ? { text: describeAnswer(q, a.payload), outcome: outcomeOf(a), points: a.points } : null;
    });
    return {
      name: p.name,
      score: list.reduce((sum, a) => sum + (a?.points ?? 0), 0),
      correct: list.filter((a) => a?.outcome === "correct").length,
      answered: list.filter(Boolean).length,
      answers: list,
    };
  });
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"));
  return {
    total: steps.filter((q) => q.type !== "slide").length,
    questions,
    players: rows.map((p) => ({ ...p, rank: rows.findIndex((o) => o.score === p.score) + 1 })),
  };
}

/** Average success rate of the scored questions, in % (null when there were none). */
export function overallSuccess(data: ReportData): number | null {
  const scored = data.questions.filter((q) => q.successRate !== null && q.responses);
  return scored.length
    ? Math.round(scored.reduce((sum, q) => sum + q.successRate!, 0) / scored.length)
    : null;
}

const cell = (value: string | number) => {
  const text = String(value);
  // Quoted when needed; a leading = + - @ is neutralised so a nickname cannot run as a formula in Excel.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const line = (values: (string | number)[]) => values.map(cell).join(";");

/**
 * The report as a CSV file for Excel (semicolons and a byte-order mark, as French Excel expects): the
 * ranking with every answer, then the figures of each question.
 */
export function reportCsv(meta: { title: string; playedAt: Date; hostName: string }, data: ReportData) {
  const date = meta.playedAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const out = [
    line([meta.title]),
    line([`Partie du ${date}, animée par ${meta.hostName}`]),
    "",
    line([
      "Rang",
      "Pseudo",
      "Score",
      "Bonnes réponses",
      "Réponses données",
      ...data.questions.flatMap((q, i) => [`Q${i + 1} · ${q.text}`, `Q${i + 1} · points`]),
    ]),
    ...data.players.map((p) =>
      line([
        p.rank,
        p.name,
        p.score,
        p.correct,
        p.answered,
        ...p.answers.flatMap((a) =>
          a
            ? [`${a.text}${a.outcome === "correct" ? " ✔" : a.outcome === "incorrect" ? " ✘" : ""}`, a.points]
            : ["(pas de réponse)", 0],
        ),
      ]),
    ),
    "",
    line([
      "Question",
      "Type",
      "Bonne réponse",
      "Réponses",
      "Réussite (%)",
      "Moyenne",
      "Réponses les plus données",
    ]),
    ...data.questions.map((q, i) =>
      line([
        `Q${i + 1} · ${q.text}`,
        q.typeLabel,
        q.solution,
        q.responses,
        q.successRate ?? "",
        q.average === null ? "" : Math.round(q.average * 10) / 10,
        q.top.map((t) => `${t.label} (${t.count})`).join(", "),
      ]),
    ),
  ];
  return `﻿${out.join("\r\n")}\r\n`;
}
