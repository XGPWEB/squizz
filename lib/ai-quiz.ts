/**
 * Quiz generation by AI: the JSON shape the model must return, the instructions it follows, and the
 * conversion of its answer into SQuizz steps (checked like any quiz from the editor).
 */
import { newQuestion, validateQuestion, type Question } from "./question";

export const AI_TYPES = [
  ["quiz", "Quiz"],
  ["truefalse", "Vrai ou faux"],
  ["text", "Réponse libre"],
  ["fill", "Textes à trous"],
  ["poll", "Sondage"],
  ["open", "Question ouverte"],
] as const;
export type AiType = (typeof AI_TYPES)[number][0];
export const AI_LEVELS = [
  ["easy", "Facile"],
  ["medium", "Intermédiaire"],
  ["hard", "Difficile"],
] as const;
export const AI_COUNTS = [5, 10, 15, 20] as const;
/** Longest pasted text (characters) and PDF (bytes) sent to the model. */
export const AI_MAX_TEXT = 60_000;
export const AI_MAX_PDF = 10 * 1024 * 1024;

/** JSON schema of the model's answer (structured outputs: every object closed, every field required). */
export const AI_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "questions"],
  properties: {
    title: { type: "string", description: "Titre court du quiz, 60 caractères au plus." },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "text", "options", "correct", "accepted", "body", "explanation"],
        properties: {
          type: { type: "string", enum: AI_TYPES.map((t) => t[0]) },
          text: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correct: { type: "array", items: { type: "integer" } },
          accepted: { type: "array", items: { type: "string" } },
          body: { type: "string" },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

export type AiAnswer = {
  title: string;
  questions: {
    type: string;
    text: string;
    options: string[];
    correct: number[];
    accepted: string[];
    body: string;
    explanation: string;
  }[];
};

export const AI_INSTRUCTIONS = `Tu prépares des quiz pour SQuizz, une application de quiz collectif en direct : un animateur projette les questions, les participants répondent sur leur téléphone.

Tu reçois un document ou un texte source et des consignes (nombre de questions, types, niveau). Écris en français, avec des questions claires et sans ambiguïté, fondées uniquement sur le contenu fourni : n'invente aucun fait. Varie les notions abordées et évite les questions dont la réponse se devine sans avoir lu le contenu.

Règles par type (tous les champs sont toujours présents ; mets [] ou "" pour ceux qui ne servent pas) :
- quiz : de 2 à 6 réponses dans "options" (150 caractères au plus chacune), une seule bonne en général ; "correct" donne la position (à partir de 0) de la ou des bonnes réponses. Les mauvaises réponses doivent être plausibles.
- truefalse : "options" vide ; "correct" vaut [0] si l'affirmation est vraie, [1] si elle est fausse.
- text : une réponse courte (un mot, un nom, un nombre) ; "accepted" liste les écritures acceptées (de 1 à 5).
- fill : "text" donne la consigne (ex. « Complétez la phrase ») ; "body" contient la phrase avec de 1 à 4 mots à trouver entre crochets, par exemple « La capitale de l'Italie est [Rome] ». Plusieurs écritures acceptées : [Rome|Roma].
- poll : un avis à recueillir, de 2 à 6 réponses dans "options", "correct" vide.
- open : une question ouverte pour recueillir des idées, rien d'autre.

"text" est la question elle-même (300 caractères au plus). "explanation" explique brièvement la bonne réponse, en une ou deux phrases tirées du contenu (vide pour poll et open). Le titre résume le sujet en quelques mots.`;

/** The request in words, with the choices made in the dialog. */
export function aiRequest(opts: { count: number; types: AiType[]; level: string; topic: string }) {
  const types = AI_TYPES.filter((t) => opts.types.includes(t[0])).map((t) => `${t[0]} (${t[1]})`);
  const level = AI_LEVELS.find((l) => l[0] === opts.level)?.[1] ?? "Intermédiaire";
  return [
    `Prépare ${opts.count} questions.`,
    `Types à utiliser, en les répartissant : ${types.join(", ")}.`,
    `Niveau : ${level}.`,
    opts.topic.trim() ? `Précisions de l'animateur : ${opts.topic.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const cut = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/** The model's answer as SQuizz steps: what does not pass the editor's checks is left out and counted. */
export function aiToQuestions(answer: AiAnswer, allowed: AiType[]) {
  const questions: Question[] = [];
  let dropped = 0;
  for (const raw of answer.questions ?? []) {
    try {
      const type = raw.type as AiType;
      if (!allowed.includes(type)) throw new Error("type");
      const q = newQuestion(type);
      q.text = cut(String(raw.text ?? "").trim(), 300);
      q.explanation =
        type === "poll" || type === "open" ? "" : cut(String(raw.explanation ?? "").trim(), 600);
      q.duration = type === "open" ? 60 : type === "fill" || type === "text" ? 30 : 20;
      if (type === "quiz" || type === "poll") {
        q.options = (raw.options ?? [])
          .map((o) => cut(String(o).trim(), 150))
          .filter(Boolean)
          .slice(0, 6);
        q.order = q.options.map((_, i) => i);
      }
      if (type === "quiz") {
        const right = [...new Set((raw.correct ?? []).filter((i) => i >= 0 && i < q.options.length))];
        if (!right.length) throw new Error("correct");
        q.correctAnswers = right;
        q.correct = right[0];
        q.multiple = right.length > 1;
      }
      if (type === "truefalse") {
        const right = raw.correct?.[0] === 1 ? 1 : 0;
        q.correctAnswers = [right];
        q.correct = right;
      }
      if (type === "text")
        q.accepted = (raw.accepted ?? [])
          .map((t) => cut(String(t).trim(), 150))
          .filter(Boolean)
          .slice(0, 10);
      if (type === "fill") q.body = cut(String(raw.body ?? ""), 1000);
      questions.push(validateQuestion(q));
    } catch {
      dropped++;
    }
  }
  return {
    title: cut(String(answer.title ?? "").trim() || "Quiz généré", 90),
    questions: questions.slice(0, 30),
    dropped,
  };
}
