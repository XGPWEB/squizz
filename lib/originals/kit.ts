import { newQuestion, type Media, type Question, type QuestionType, type SlideLayout } from "@/lib/question";

/**
 * Building blocks of the « vitrine » SQuizz Originals (2026-11). Media live in public/originals/<folder>,
 * under neutral names so that no address gives an answer away. Photos, films and recordings come from
 * Wikimedia Commons under free licences: the caption credits the author and the licence.
 */
type Fields = Partial<Question>;
const make = (type: QuestionType, fields: Fields): Question => ({ ...newQuestion(type), ...fields });

export const media = (folder: string) => ({
  img: (name: string, caption = ""): Media => ({
    kind: "image",
    url: `/originals/${folder}/${name}.webp`,
    caption,
  }),
  video: (name: string, caption = ""): Media => ({
    kind: "video",
    url: `/originals/${folder}/${name}.mp4`,
    caption,
  }),
  audio: (name: string, caption = ""): Media => ({
    kind: "audio",
    url: `/originals/${folder}/${name}.mp3`,
    caption,
  }),
});

export const slide = (layout: SlideLayout, text: string, body: string, m: Media[] = []) =>
  make("slide", { ...newQuestion("slide", layout), text, body, media: m, duration: 20 });

/** One right answer (or several with `multiple`): `correct` lists their indexes. */
export const choice = (
  text: string,
  options: string[],
  correct: number | number[],
  explanation: string,
  more: Fields = {},
) => {
  const answers = Array.isArray(correct) ? correct : [correct];
  return make("quiz", {
    text,
    options,
    order: options.map((_, i) => i),
    correct: answers[0],
    correctAnswers: answers,
    multiple: answers.length > 1,
    duration: 20,
    explanation,
    ...more,
  });
};
export const trueFalse = (text: string, isTrue: boolean, explanation: string, more: Fields = {}) =>
  make("truefalse", {
    text,
    correct: isTrue ? 0 : 1,
    correctAnswers: [isTrue ? 0 : 1],
    duration: 15,
    explanation,
    ...more,
  });
export const typed = (text: string, accepted: string[], explanation: string, more: Fields = {}) =>
  make("text", { text, accepted, duration: 30, explanation, ...more });
export const blindTest = (text: string, extract: Media, accepted: string[], explanation: string) =>
  make("blindtest", { text, media: [extract], accepted, duration: 30, explanation });
export const slider = (
  text: string,
  range: { min: number; max: number; step?: number; target: number; tolerance: number; unit?: string },
  explanation: string,
  more: Fields = {},
) => make("slider", { text, step: 1, unit: "", ...range, duration: 20, explanation, ...more });
/** Options are given in the right order; the game shuffles them. */
export const puzzle = (text: string, options: string[], explanation: string, more: Fields = {}) =>
  make("puzzle", { text, options, order: options.map((_, i) => i), duration: 30, explanation, ...more });
/** Pairs are given matched; the game shuffles the right-hand column. */
export const match = (text: string, pairs: [string, string][], explanation: string, more: Fields = {}) =>
  make("match", {
    text,
    options: pairs.map(([left]) => left),
    targets: pairs.map(([, right]) => right),
    order: pairs.map((_, i) => i),
    duration: 45,
    explanation,
    ...more,
  });
export const fill = (text: string, body: string, explanation: string, more: Fields = {}) =>
  make("fill", { text, body, duration: 45, explanation, ...more });
export const pin = (
  text: string,
  picture: Media,
  spot: { x: number; y: number; radius: number },
  explanation: string,
) => make("pin", { text, media: [picture], pin: spot, duration: 30, explanation });

export const poll = (text: string, options: string[], more: Fields = {}) =>
  make("poll", { text, options, order: options.map((_, i) => i), duration: 20, ...more });
export const scale = (text: string, minLabel: string, maxLabel: string, more: Fields = {}) =>
  make("scale", { text, max: 5, minLabel, maxLabel, duration: 20, ...more });
export const opinion = (
  type: "wordcloud" | "open" | "brainstorm" | "nps" | "pinpoll" | "wheel",
  text: string,
  more: Fields = {},
) =>
  make(type, {
    text,
    duration: type === "wordcloud" ? 30 : type === "brainstorm" || type === "open" ? 60 : 20,
    ...more,
  });

const shared = media("commun");
/** The last step of every Original: an invitation to make one's own quiz. */
export const outro = (text: string, body: string) =>
  slide("titletext", text, body, [shared.img("a-vous", "À vous de créer")]);
