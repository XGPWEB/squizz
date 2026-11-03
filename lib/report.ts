import {
  aggregateAnswers,
  asksNothing,
  formatValue,
  isScored,
  parseBlanks,
  questionTypes,
  type AnswerPayload,
  type Question,
} from "./question";
import type { Sheet } from "./xlsx";
import { teamName, teamStandings } from "./teams";

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
  /** Answered anonymously: only the figures are kept, never who said what. */
  anonymous: boolean;
};
export type ReportPlayer = {
  name: string;
  /** Team mode: the player's team (from 0). */
  team?: number | null;
  rank: number;
  score: number;
  correct: number;
  answered: number;
  /** In the order of `questions`; null when the player did not answer. */
  answers: (ReportAnswer | null)[];
};
export type ReportData = {
  questions: ReportQuestion[];
  players: ReportPlayer[];
  total: number;
  /** Questions from the audience that were shown, without who asked, most supported first. */
  qa?: { text: string; votes: number; answered: boolean }[];
  /** Team mode: the teams in ranking order. */
  teams?: { name: string; color: string; players: number; score: number; rank: number }[];
};

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
  if (a.blanks) return a.blanks.map((t) => t || "…").join(" · ");
  if (a.matches) return a.matches.map((t, i) => `${q.options[i]} → ${q.targets[t] ?? "?"}`).join(" · ");
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
    case "fill":
      return parseBlanks(q.body)
        .answers.map((a) => a.join(" / "))
        .join(" · ");
    case "match":
      return q.options.map((o, i) => `${o} → ${q.targets[q.order[i]]}`).join(" · ");
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
  players: { id: string; name: string; team?: number | null }[],
  answers: RawAnswer[],
  teamCount = 0,
): ReportData {
  const kept = steps
    .map((q, index) => ({ q, index }))
    .filter(({ q, index }) => index < played && !asksNothing(q.type));
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
      anonymous: q.anonymous,
    };
  });
  const rows = players.map((p) => {
    const list = kept.map(({ q, index }) => {
      const a = byKey.get(`${p.id}:${index}`);
      if (!a) return null;
      return q.anonymous
        ? { text: "Réponse anonyme", outcome: "opinion" as const, points: 0 }
        : { text: describeAnswer(q, a.payload), outcome: outcomeOf(a), points: a.points };
    });
    return {
      name: p.name,
      ...(teamCount ? { team: p.team ?? null } : {}),
      score: list.reduce((sum, a) => sum + (a?.points ?? 0), 0),
      correct: list.filter((a) => a?.outcome === "correct").length,
      answered: list.filter(Boolean).length,
      answers: list,
    };
  });
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fr"));
  return {
    total: steps.filter((q) => !asksNothing(q.type)).length,
    ...(teamCount
      ? {
          teams: teamStandings(
            teamCount,
            rows.map((p) => ({ team: p.team ?? null, score: p.score })),
          ).map(({ name, color, players, score, rank }) => ({ name, color, players, score, rank })),
        }
      : {}),
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

/**
 * The report as an Excel workbook: the ranking with every answer, then the figures of each question.
 * Cells are plain text or numbers, never formulas, whatever the nicknames say.
 */
export function reportSheets(
  meta: { title: string; playedAt: Date; hostName: string },
  data: ReportData,
): Sheet[] {
  const date = meta.playedAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const label = (i: number, q: ReportQuestion) => `Q${i + 1} · ${q.text}`;
  return [
    {
      name: "Classement",
      widths: [8, 22, 10, 16, 16, ...data.questions.flatMap(() => [28, 8])],
      rows: [
        [
          "Rang",
          "Pseudo",
          ...(data.teams ? ["Équipe"] : []),
          "Score",
          "Bonnes réponses",
          "Réponses données",
          ...data.questions.flatMap((q, i) => [label(i, q), "Points"]),
        ],
        ...data.players.map((p) => [
          p.rank,
          p.name,
          ...(data.teams ? [p.team === null || p.team === undefined ? "" : teamName(p.team)] : []),
          p.score,
          p.correct,
          p.answered,
          ...p.answers.flatMap((a) =>
            a
              ? [
                  `${a.text}${a.outcome === "correct" ? " ✔" : a.outcome === "incorrect" ? " ✘" : ""}`,
                  a.points,
                ]
              : ["(pas de réponse)", 0],
          ),
        ]),
      ],
    },
    {
      name: "Questions",
      widths: [46, 16, 24, 11, 13, 10, 60],
      rows: [
        [
          "Question",
          "Type",
          "Bonne réponse",
          "Réponses",
          "Réussite (%)",
          "Moyenne",
          "Réponses les plus données",
        ],
        ...data.questions.map((q, i) => [
          label(i, q),
          q.typeLabel,
          q.solution,
          q.responses,
          q.successRate,
          q.average === null ? null : Math.round(q.average * 10) / 10,
          q.top.map((t) => `${t.label} (${t.count})`).join(", "),
        ]),
      ],
    },
    ...(data.teams
      ? [
          {
            name: "Équipes",
            widths: [8, 24, 10, 16],
            rows: [
              ["Rang", "Équipe", "Joueurs", "Score moyen"],
              ...data.teams.map((t) => [t.rank, t.name, t.players, t.score]),
            ],
          },
        ]
      : []),
    ...(data.qa?.length
      ? [
          {
            name: "Questions du public",
            widths: [80, 10, 12],
            rows: [
              ["Question", "Votes", "Répondue"],
              ...data.qa.map((q) => [q.text, q.votes, q.answered ? "oui" : ""]),
            ],
          },
        ]
      : []),
    {
      name: "Partie",
      widths: [22, 60],
      rows: [
        ["Quiz", meta.title],
        ["Date", date],
        ["Animée par", meta.hostName],
        ["Joueurs", data.players.length],
        ["Questions jouées", `${data.questions.length} sur ${data.total}`],
        ["Réussite moyenne (%)", overallSuccess(data)],
      ],
    },
  ];
}
