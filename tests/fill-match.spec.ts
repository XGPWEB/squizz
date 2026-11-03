import { describe, expect, it } from "vitest";
import {
  aggregateAnswers,
  evaluateAnswer,
  newQuestion,
  parseBlanks,
  publicQuestion,
  validateQuestion,
  type Question,
} from "@/lib/question";
import { describeAnswer, describeSolution } from "@/lib/report";

const fill: Question = {
  ...newQuestion("fill"),
  text: "Complétez",
  body: "La capitale de la France est [Paris] et celle de l’Italie est [Rome|Roma].",
};
const match: Question = {
  ...newQuestion("match"),
  text: "Reliez",
  options: ["Italie", "Japon", "Pérou"],
  targets: ["Rome", "Tokyo", "Lima"],
  order: [0, 1, 2],
};

describe("textes à trous", () => {
  it("découpe le texte et les réponses acceptées", () => {
    expect(parseBlanks(fill.body)).toEqual({
      parts: ["La capitale de la France est ", " et celle de l’Italie est ", "."],
      answers: [["Paris"], ["Rome", "Roma"]],
    });
  });

  it("ne montre jamais les mots à trouver avant la correction", () => {
    const hidden = publicQuestion(validateQuestion(fill), false, 0, false);
    expect(JSON.stringify(hidden)).not.toMatch(/Paris|Rome/);
    expect(hidden.fillParts).toHaveLength(3);
    expect(publicQuestion(fill, true).body).toBe(fill.body);
  });

  it("corrige sans tenir compte des majuscules ni des accents", () => {
    expect(evaluateAnswer(fill, { blanks: [" paris", "ROMA"] }).correct).toBe(true);
    expect(evaluateAnswer(fill, { blanks: ["Paris", "Milan"] }).correct).toBe(false);
    expect(() => evaluateAnswer(fill, { blanks: ["Paris"] })).toThrow();
    expect(() => evaluateAnswer(fill, { blanks: ["", " "] })).toThrow();
  });

  it("compte qui a trouvé chaque trou", () => {
    const agg = aggregateAnswers(fill, [{ blanks: ["Paris", "Rome"] }, { blanks: ["paris", "Milan"] }]);
    expect(agg.counts).toEqual([
      { label: "Paris", count: 2 },
      { label: "Rome", count: 1 },
    ]);
    expect(describeSolution(fill)).toBe("Paris · Rome / Roma");
    expect(describeAnswer(fill, { blanks: ["Paris", ""] })).toBe("Paris · …");
  });

  it("refuse un texte sans trou", () => {
    expect(() => validateQuestion({ ...fill, body: "Pas de trou ici." })).toThrow(/crochets/);
  });
});

describe("appariement", () => {
  it("corrige les paires", () => {
    expect(evaluateAnswer(match, { matches: [0, 1, 2] }).correct).toBe(true);
    expect(evaluateAnswer(match, { matches: [1, 0, 2] }).correct).toBe(false);
    expect(() => evaluateAnswer(match, { matches: [0, 0, 2] })).toThrow();
  });

  it("cache la solution avant la correction", () => {
    const hidden = publicQuestion(match, false, 0, false);
    expect(hidden).not.toHaveProperty("order");
    expect(publicQuestion(match, true).order).toEqual([0, 1, 2]);
  });

  it("refuse deux éléments de droite identiques", () => {
    expect(() => validateQuestion({ ...match, targets: ["Rome", "rome", "Lima"] })).toThrow(/identiques/);
  });

  it("décrit les paires et compte les réussites", () => {
    expect(describeSolution(match)).toBe("Italie → Rome · Japon → Tokyo · Pérou → Lima");
    expect(describeAnswer(match, { matches: [1, 0, 2] })).toBe(
      "Italie → Tokyo · Japon → Rome · Pérou → Lima",
    );
    expect(aggregateAnswers(match, [{ matches: [0, 1, 2] }, { matches: [1, 0, 2] }]).counts[2]).toEqual({
      label: "Pérou → Lima",
      count: 2,
    });
  });
});
