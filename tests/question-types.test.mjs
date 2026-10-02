import assert from "node:assert/strict";
import {
  newQuestion,
  validateQuestion,
  evaluateAnswer,
  publicQuestion,
  aggregateAnswers,
  youtubeId,
  youtubeStart,
} from "../lib/question.ts";
const make = (type, extra = {}) => validateQuestion({ ...newQuestion(type), text: "Test", ...extra });
const quiz = make("quiz", { options: ["A", "B", "C", "D"], multiple: true, correctAnswers: [0, 2] });
assert(evaluateAnswer(quiz, { choices: [2, 0] }).correct);
assert(!evaluateAnswer(quiz, { choices: [0] }).correct);
assert(!evaluateAnswer(quiz, { choices: [0, 1, 2] }).correct);
assert.throws(() => evaluateAnswer(quiz, { choices: [0, 0] }));
const tf = make("truefalse", { correctAnswers: [1] });
assert(evaluateAnswer(tf, { choices: [1] }).correct);
const text = make("text", { accepted: ["Éléphant", "elephant africain"] });
assert(evaluateAnswer(text, { text: "  ELEPHANT  " }).correct);
const extract = {
  kind: "audio",
  url: "/api/media/11111111-2222-3333-4444-555555555555",
  caption: "La Bohème",
};
const blind = make("blindtest", { accepted: ["La Bohème", "Aznavour"], media: [extract] });
assert(evaluateAnswer(blind, { text: " la boheme " }).correct);
assert(evaluateAnswer(blind, { text: "AZNAVOUR" }).correct);
assert(!evaluateAnswer(blind, { text: "Brel" }).correct);
// The extract is required, and players never receive it (its link or caption) before the reveal.
assert.throws(() => make("blindtest", { accepted: ["x"] }), /extrait/);
assert.throws(() =>
  make("blindtest", { accepted: ["x"], media: [{ kind: "image", url: "https://a.fr/a.png", caption: "" }] }),
);
assert.equal(publicQuestion(blind, false, 0, false).media.length, 0);
assert.equal(publicQuestion(blind, false, 0, true).media.length, 1);
assert.equal(publicQuestion(blind, true, 0, false).media.length, 1);
assert.equal(youtubeStart("https://youtu.be/dQw4w9WgXcQ?t=43"), 43);
assert.equal(youtubeStart("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m05s"), 65);
assert.equal(youtubeStart("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), 0);
const slider = make("slider", { target: 50, tolerance: 2 });
assert(evaluateAnswer(slider, { value: 52 }).correct);
assert(!evaluateAnswer(slider, { value: 53 }).correct);
assert.throws(() => evaluateAnswer(slider, { value: 3.5 }));
const image = { kind: "image", url: "https://example.com/image.png", caption: "Carte" };
const pin = make("pin", { media: [image] });
assert(evaluateAnswer(pin, { x: 0.5, y: 0.5 }).correct);
assert(!evaluateAnswer(pin, { x: 0.1, y: 0.1 }).correct);
assert.throws(() => evaluateAnswer(pin, { x: 2, y: 0.5 }));
const puzzle = make("puzzle", { options: ["A", "B", "C"], order: [1, 0, 2] });
assert(evaluateAnswer(puzzle, { order: [1, 0, 2] }).correct);
assert.throws(() => evaluateAnswer(puzzle, { order: [1, 1, 2] }));
for (const q of [quiz, tf, text, blind, slider, pin, puzzle]) {
  const visible = publicQuestion(q, false);
  for (const field of ["correct", "correctAnswers", "accepted", "target", "tolerance", "pin", "order"])
    assert(!(field in visible), `${q.type} leaked ${field}`);
}
for (const [type, extra, answer] of [
  ["poll", { options: ["A", "B"] }, { choices: [0] }],
  ["scale", {}, { value: 3 }],
  ["nps", {}, { value: 9 }],
  ["pinpoll", { media: [image] }, { x: 0.1, y: 0.4 }],
  ["wordcloud", {}, { text: "Ensemble" }],
  ["open", {}, { text: "Une idée" }],
  ["brainstorm", {}, { ideas: ["Une idée", "Une autre"] }],
]) {
  const q = make(type, extra);
  assert.equal(q.points, "none");
  assert.equal(evaluateAnswer(q, answer).correct, null);
}
assert.throws(() => evaluateAnswer(make("slide"), {}));
const nps = aggregateAnswers(make("nps"), [{ value: 10 }, { value: 9 }, { value: 8 }, { value: 3 }]);
assert.equal(nps.nps, 25);
assert.deepEqual(aggregateAnswers(make("wordcloud"), [{ text: "Équipe" }, { text: "equipe" }]).texts, [
  { label: "Équipe", count: 2 },
]);
assert.equal(youtubeId("https://youtu.be/dQw4w9WgXcQ?t=30"), "dQw4w9WgXcQ");
assert.equal(youtubeId("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
assert.throws(() => make("slide", { media: [{ kind: "link", url: "javascript:alert(1)", caption: "" }] }));
assert.throws(() => make("quiz", { options: ["A", "B"], duration: 7 }));
assert.throws(() => make("pin"));
for (const layout of ["classic", "title", "titletext", "bullets", "quote", "bigimage"])
  assert.equal(validateQuestion({ ...newQuestion("slide", layout), text: "Diapo" }).layout, layout);
assert.equal(validateQuestion({ type: "slide", text: "Ancienne diapo" }).layout, "classic");
assert.throws(() => validateQuestion({ ...newQuestion("slide"), text: "Diapo", layout: "wide" }));
const money = make("slider", { min: 0, max: 5000000, step: 10000, target: 2380000, unit: " $ " });
assert.equal(money.unit, "$");
assert.throws(() => make("slider", { unit: "x".repeat(13) }));
assert.equal(newQuestion("nps").minLabel, "Peu probable");
assert.equal(make("scale", { minLabel: "Non", maxLabel: "Oui" }).maxLabel, "Oui");
assert.throws(() => make("scale", { minLabel: "x".repeat(41) }));
console.log(
  "PASS: 14 types, 6 slide layouts, units, scale labels, multiple-answer correctness, free text, tolerance, pins, puzzle, opinion aggregation, hidden solutions, and media validation.",
);
