import {
  canBeAnonymous,
  durations,
  newQuestion,
  validateQuestion,
  type Question,
  type QuestionType,
} from "./question";
import type { Rows } from "./sheet";
import type { Sheet } from "./xlsx";

/** Same limits as the editor (lib/server/quiz-store.ts). */
export const IMPORT_MAX_QUESTIONS = 30;
const MAX_OPTIONS = 6;

const fold = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, " ").replace(/\s+/g, " ").trim();

/**
 * Column headers understood, in French and in English (Kahoot's spreadsheet template among them).
 * A header matches when it starts with one of the words: « Answer 1 - max 75 characters » is « answer 1 ».
 */
const columns: { key: string; words: string[] }[] = [
  { key: "type", words: ["type de question", "type", "question type"] },
  { key: "question", words: ["question", "intitule", "enonce", "texte de la question"] },
  {
    key: "correct",
    words: [
      "bonne reponse",
      "bonnes reponses",
      "bonne(s) reponse(s)",
      "reponse correcte",
      "reponses correctes",
      "solution",
      "correct answer",
    ],
  },
  { key: "time", words: ["temps", "duree", "time limit", "time", "chrono"] },
  { key: "points", words: ["points", "bareme"] },
  { key: "explanation", words: ["explication", "explanation", "commentaire"] },
  { key: "anonymous", words: ["anonyme", "anonymous", "reponses anonymes"] },
];
const optionHeader = /^(?:reponse|answer|choix|option|proposition)\s*([1-6])\b/;

/** Each type, by the names people give it (the French label first). */
const typeNames: [QuestionType, string[]][] = [
  ["quiz", ["quiz", "qcm", "choix multiple", "choix", "multiple choice", "question a choix"]],
  ["truefalse", ["vrai ou faux", "vrai/faux", "vrai faux", "true or false", "true/false", "true false"]],
  ["text", ["reponse libre", "reponse courte", "texte", "type answer", "saisie"]],
  ["slider", ["curseur", "slider", "nombre"]],
  ["puzzle", ["puzzle", "remettre dans l ordre", "ordre", "classement"]],
  ["poll", ["sondage", "poll", "vote"]],
  ["scale", ["echelle", "scale", "likert"]],
  ["nps", ["nps", "echelle nps"]],
  ["wordcloud", ["nuage de mots", "nuage", "word cloud"]],
  ["open", ["question ouverte", "ouverte", "open", "open-ended"]],
  ["brainstorm", ["brainstorming", "brainstorm", "idees"]],
  ["slide", ["diapo", "diapositive", "slide", "information"]],
];
export const importTypeLabels = [
  "Quiz",
  "Vrai ou faux",
  "Réponse libre",
  "Curseur",
  "Puzzle",
  "Sondage",
  "Échelle",
  "Échelle NPS",
  "Nuage de mots",
  "Question ouverte",
  "Brainstorming",
  "Diapo",
];

function typeOf(raw: string): QuestionType | null {
  const name = fold(raw);
  if (!name) return "quiz";
  return typeNames.find(([, names]) => names.includes(name))?.[0] ?? null;
}

/** The answers marked as right: numbers (1, 2…), letters (A, B…) or the text of an answer. */
function correctIndexes(raw: string, options: string[]): number[] | null {
  const tokens = raw
    .split(/\s*(?:[,;/+&]|\bet\b|\band\b)\s*/i)
    .map((t) => t.trim())
    .filter(Boolean);
  const found = tokens.map((t) => {
    if (/^\d+$/.test(t)) return Number(t) - 1;
    if (/^[a-f]$/i.test(t)) return t.toLowerCase().charCodeAt(0) - 97;
    return options.findIndex((o) => fold(o) === fold(t));
  });
  if (!found.length || found.some((i) => i < 0 || i >= options.length)) {
    // An answer containing a comma or a slash, written out in full.
    const whole = options.findIndex((o) => fold(o) === fold(raw));
    return whole >= 0 ? [whole] : null;
  }
  return [...new Set(found)];
}

const number = (raw: string) => {
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  return raw.trim() && Number.isFinite(n) ? n : null;
};
const closestDuration = (seconds: number) =>
  durations.reduce((best, d) => (Math.abs(d - seconds) < Math.abs(best - seconds) ? d : best));
const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export type ImportResult = {
  questions: Question[];
  /** Rows left out (or kept with a change when `kept`), numbered as in the spreadsheet. */
  skipped: { row: number; reason: string; kept?: boolean }[];
  /** Rows beyond the limit of questions per quiz. */
  extra: number;
};

/** Turns the rows of a spreadsheet into quiz steps, keeping what can be kept and saying why the rest was not. */
export function rowsToQuestions(rows: Rows): ImportResult {
  const headerAt = rows.slice(0, 20).findIndex((r) => r.some((c) => fold(c).startsWith("question")));
  if (headerAt < 0)
    throw new Error(
      "Colonne « Question » introuvable : partez du modèle à télécharger à côté du bouton Importer.",
    );
  const header = rows[headerAt].map((h) => fold(h.split(/\s[-–(]\s?/)[0]));
  const at: Record<string, number> = {};
  const optionColumns: number[] = [];
  header.forEach((h, i) => {
    const option = optionHeader.exec(h);
    if (option) optionColumns[Number(option[1]) - 1] = i;
    else {
      // One meaning per column, the first that fits: « question type » is the type, not the question.
      const match = columns.find(({ words }) =>
        words.some((w) => h.startsWith(w) && !/[a-z0-9]/.test(h[w.length] ?? "")),
      );
      if (match && at[match.key] === undefined) at[match.key] = i;
    }
  });
  if (at.question === undefined)
    throw new Error(
      "Colonne « Question » introuvable : partez du modèle à télécharger à côté du bouton Importer.",
    );
  const result: ImportResult = { questions: [], skipped: [], extra: 0 };
  rows.slice(headerAt + 1).forEach((r, i) => {
    const row = headerAt + 2 + i;
    const get = (key: string) => (at[key] === undefined ? "" : (r[at[key]] ?? "").trim());
    const text = get("question");
    const options = optionColumns.map((c) => (c === undefined ? "" : (r[c] ?? "").trim())).filter(Boolean);
    if (!text && !options.length) return; // empty line
    const skip = (reason: string) => result.skipped.push({ row, reason });
    if (!text) return skip("pas de question");
    const type = typeOf(get("type"));
    if (!type) return skip(`type « ${get("type")} » inconnu`);
    if (result.questions.length >= IMPORT_MAX_QUESTIONS) {
      result.extra++;
      return;
    }
    const q = newQuestion(type);
    q.text = cut(text, 300);
    q.explanation = type === "slide" ? "" : cut(get("explanation"), 600);
    const seconds = number(get("time"));
    if (seconds) q.duration = closestDuration(seconds > 1000 ? seconds / 1000 : seconds); // Kahoot: ms or s
    if (q.points !== "none") {
      const points = fold(get("points"));
      if (["double", "2", "x2", "×2"].includes(points)) q.points = "double";
      else if (["0", "aucun", "aucuns", "sans", "non", "none", "no points"].includes(points))
        q.points = "none";
    }
    if (canBeAnonymous(type))
      q.anonymous = ["oui", "o", "x", "1", "yes", "y", "vrai", "anonyme"].includes(fold(get("anonymous")));
    const correct = get("correct");
    if (type === "quiz" || type === "poll" || type === "puzzle") {
      if (options.length < 2) return skip("il faut au moins 2 réponses");
      if (options.length > MAX_OPTIONS)
        result.skipped.push({
          row,
          reason: `seules les ${MAX_OPTIONS} premières réponses sont gardées`,
          kept: true,
        });
      q.options = options.slice(0, MAX_OPTIONS).map((o) => cut(o, 150));
      q.order = q.options.map((_, k) => k);
      if (type === "quiz") {
        const right = correct ? correctIndexes(correct, q.options) : null;
        if (!right)
          return skip(correct ? `bonne réponse « ${correct} » introuvable` : "bonne réponse manquante");
        q.correctAnswers = right;
        q.correct = right[0];
        q.multiple = right.length > 1;
      }
    }
    if (type === "truefalse") {
      const answer = fold(correct || options[0] || "");
      const index = ["vrai", "v", "true", "oui", "1"].includes(answer)
        ? 0
        : ["faux", "f", "false", "non", "2"].includes(answer)
          ? 1
          : -1;
      if (index < 0) return skip("indiquez « Vrai » ou « Faux » comme bonne réponse");
      q.correctAnswers = [index];
      q.correct = index;
    }
    if (type === "text") {
      const accepted = (correct ? correct.split(/\s*[;/|]\s*/) : options)
        .map((t) => cut(t.trim(), 150))
        .filter(Boolean);
      if (!accepted.length) return skip("indiquez la ou les réponses acceptées");
      q.accepted = accepted.slice(0, 10);
    }
    if (type === "slider") {
      const [min, max] = [number(options[0] ?? ""), number(options[1] ?? "")];
      const target = number(correct);
      if (target === null) return skip("indiquez le nombre à trouver en bonne réponse");
      q.min = min ?? Math.min(0, target);
      q.max = max ?? Math.max(100, target * 2);
      q.target = target;
      q.step = Number.isInteger(q.min) && Number.isInteger(q.max) && Number.isInteger(target) ? 1 : 0.1;
    }
    if (type === "scale") {
      const max = number(options[0] ?? "");
      if (max !== null) q.max = max;
    }
    if (type === "slide") q.body = cut(options.join("\n"), 4000);
    try {
      result.questions.push(validateQuestion(q));
    } catch (e) {
      skip((e as Error).message.replace(/\.$/, "").toLowerCase());
    }
  });
  return result;
}

/** A title from the file name: « Formation sécurité 2026.xlsx » → « Formation sécurité 2026 ». */
export const titleFromFile = (name: string) =>
  cut(
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[_]+/g, " ")
      .trim() || "Quiz importé",
    90,
  );

/** The template offered next to the Import button: one example per type, and how to fill each column. */
export function importTemplate(): Sheet[] {
  const head = [
    "Type",
    "Question",
    "Réponse 1",
    "Réponse 2",
    "Réponse 3",
    "Réponse 4",
    "Réponse 5",
    "Réponse 6",
    "Bonne réponse",
    "Temps (s)",
    "Points",
    "Explication",
    "Anonyme",
  ];
  const row = (
    type: string,
    question: string,
    answers: string[],
    correct = "",
    time: number | "" = 20,
    points = "",
    explanation = "",
    anonymous = "",
  ) => [
    type,
    question,
    ...Array.from({ length: 6 }, (_, i) => answers[i] ?? ""),
    correct,
    time,
    points,
    explanation,
    anonymous,
  ];
  return [
    {
      name: "Questions",
      widths: [16, 46, 18, 18, 18, 18, 14, 14, 18, 10, 10, 40, 10],
      rows: [
        head,
        row(
          "Quiz",
          "Quelle est la capitale de l’Australie ?",
          ["Sydney", "Canberra", "Melbourne", "Perth"],
          "2",
          20,
          "",
          "Canberra a été choisie comme compromis entre Sydney et Melbourne.",
        ),
        row("Quiz", "Lesquels sont des fruits ?", ["Tomate", "Carotte", "Avocat", "Poireau"], "1, 3", 30),
        row(
          "Vrai ou faux",
          "La Grande Muraille de Chine se voit de l’espace à l’œil nu.",
          [],
          "Faux",
          20,
          "double",
        ),
        row("Réponse libre", "Quel est le symbole chimique de l’or ?", [], "Au", 30),
        row("Curseur", "En quelle année l’homme a-t-il marché sur la Lune ?", ["1950", "2000"], "1969", 30),
        row(
          "Puzzle",
          "Classez ces planètes de la plus proche à la plus éloignée du Soleil.",
          ["Mercure", "Vénus", "Terre", "Mars"],
          "",
          45,
        ),
        row(
          "Sondage",
          "Quel format préférez-vous ?",
          ["En salle", "À distance", "Les deux"],
          "",
          30,
          "",
          "",
          "oui",
        ),
        row("Échelle", "Cette formation vous a-t-elle été utile ?", ["5"], "", 30),
        row("Nuage de mots", "Un mot pour résumer la journée ?", [], "", 45),
        row("Diapo", "Pause café : reprise dans 10 minutes", ["À tout de suite !"], "", ""),
      ],
    },
    {
      name: "Mode d’emploi",
      widths: [22, 90],
      rows: [
        ["Colonne", "Comment la remplir"],
        ["Type", `Un de ces types (vide = Quiz) : ${importTypeLabels.join(", ")}.`],
        ["Question", "Le texte de la question (300 caractères au plus). Obligatoire."],
        [
          "Réponse 1 à 6",
          "Les réponses proposées (Quiz, Sondage, Puzzle). Pour un Puzzle, dans le bon ordre : elles seront mélangées pendant la partie. Pour un Curseur : le minimum en Réponse 1 et le maximum en Réponse 2. Pour une Échelle : la note la plus haute en Réponse 1. Pour une Diapo : le texte affiché.",
        ],
        [
          "Bonne réponse",
          "Quiz : le numéro (1, 2…), la lettre (A, B…) ou le texte de la réponse ; plusieurs séparées par des virgules. Vrai ou faux : Vrai ou Faux. Réponse libre : les réponses acceptées, séparées par des barres obliques (Au / Or). Curseur : le nombre à trouver. Vide pour les avis.",
        ],
        ["Temps (s)", "Le temps de réponse en secondes (5 à 240). Vide = 20 secondes."],
        ["Points", "Vide = normaux, « double » = doublés, « aucun » = sans points."],
        ["Explication", "Facultatif : affichée avec la correction (600 caractères au plus)."],
        [
          "Anonyme",
          "« oui » pour une question d’avis à laquelle on répond sans que personne sache qui a répondu quoi. Ignoré pour les questions notées.",
        ],
        ["", ""],
        [
          "Bon à savoir",
          "Les fichiers .csv et le modèle de tableur de Kahoot sont aussi acceptés. Les lignes vides sont ignorées ; les lignes qui posent problème sont signalées après l’import. Un quiz compte 30 étapes au plus. Les images et vidéos s’ajoutent ensuite dans l’éditeur.",
        ],
      ],
    },
  ];
}
