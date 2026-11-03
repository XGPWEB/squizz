import { describe, expect, it } from "vitest";
import { newQuestion, type Question } from "@/lib/question";
import { buildReport, describeAnswer, overallSuccess, reportSheets, type RawAnswer } from "@/lib/report";
import { readXlsx } from "@/lib/sheet";
import { buildXlsx } from "@/lib/xlsx";

const quiz: Question = {
  ...newQuestion("quiz"),
  text: "Capitale de l’Italie ?",
  options: ["Rome", "Milan", "Naples", "Turin"],
  correct: 0,
  correctAnswers: [0],
};
const slide: Question = { ...newQuestion("slide"), text: "Pause" };
const poll: Question = { ...newQuestion("poll"), text: "Ton fruit ?", options: ["Pomme", "Poire", "", ""] };
const slider: Question = {
  ...newQuestion("slider"),
  text: "Année ?",
  min: 1900,
  max: 2000,
  step: 1,
  target: 1969,
  tolerance: 0,
};
const steps = [quiz, slide, poll, slider];
const players = [
  { id: "a", name: "Alice" },
  { id: "b", name: "=Bob" },
  { id: "c", name: "Chloé" },
];
const answers: RawAnswer[] = [
  { player: "a", question: 0, points: 900, payload: { choices: [0] }, correctness: 1 },
  { player: "b", question: 0, points: 0, payload: { choices: [1] }, correctness: 0 },
  { player: "c", question: 0, points: 900, payload: { choices: [0] }, correctness: 1 },
  { player: "a", question: 2, points: 0, payload: { choices: [1] }, correctness: -1 },
  { player: "b", question: 2, points: 0, payload: { choices: [1] }, correctness: -1 },
  { player: "a", question: 3, points: 800, payload: { value: 1969 }, correctness: 1 },
];

describe("rapport de partie", () => {
  it("garde les questions jouées, sans les diapos", () => {
    const r = buildReport(steps, 3, players, answers);
    expect(r.total).toBe(3);
    expect(r.questions.map((q) => q.index)).toEqual([0, 2]);
    expect(r.questions[0]).toMatchObject({ responses: 3, successRate: 67, solution: "Rome" });
    expect(r.questions[1]).toMatchObject({
      successRate: null,
      solution: "",
      top: [{ label: "Poire", count: 2 }],
    });
  });

  it("classe les joueurs avec les ex æquo au même rang", () => {
    const r = buildReport(steps, 3, players, answers);
    expect(r.players.map((p) => [p.name, p.rank, p.score, p.correct, p.answered])).toEqual([
      ["Alice", 1, 900, 1, 2],
      ["Chloé", 1, 900, 1, 1],
      ["=Bob", 3, 0, 0, 2],
    ]);
    expect(r.players[1].answers[1]).toBeNull();
    expect(r.players[0].answers[1]).toEqual({ text: "Poire", outcome: "opinion", points: 0 });
  });

  it("compte toute la partie une fois terminée", () => {
    const r = buildReport(steps, steps.length, players, answers);
    expect(r.players[0]).toMatchObject({ name: "Alice", score: 1700, correct: 2 });
    expect(overallSuccess(r)).toBe(50); // (67 + 33) / 2
  });

  it("décrit chaque type de réponse en mots", () => {
    expect(describeAnswer(slider, { value: 1969 })).toBe("1\u202f969");
    expect(describeAnswer({ ...quiz, type: "puzzle" }, { order: [2, 0] })).toBe("Naples → Rome");
    expect(describeAnswer(newQuestion("brainstorm"), { ideas: ["a", "b"] })).toBe("a · b");
  });

  it("exporte un classeur Excel : classement, questions, partie", async () => {
    const sheets = reportSheets(
      { title: "Test", playedAt: new Date("2026-11-03T10:00:00Z"), hostName: "Xavier" },
      buildReport(steps, 3, players, answers),
    );
    expect(sheets.map((s) => s.name)).toEqual(["Classement", "Questions", "Partie"]);
    expect(sheets[0].rows[3]).toEqual([3, "=Bob", 0, 0, 2, "Milan ✘", 0, "Poire", 0]);
    expect(sheets[1].rows[1]).toEqual([
      "Q1 · Capitale de l’Italie ?",
      "Quiz",
      "Rome",
      3,
      67,
      null,
      "Rome (2), Milan (1)",
    ]);
    // Read back with the import reader: the file is a real workbook.
    const rows = await readXlsx(buildXlsx(sheets));
    expect(rows[3].slice(0, 2)).toEqual(["3", "=Bob"]);
  });
});
