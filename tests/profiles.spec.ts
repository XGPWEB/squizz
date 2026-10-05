import { describe, expect, it } from "vitest";
import { isProfileQuiz, profileResults, quizProfiles, validateProfiles } from "@/lib/profiles";
import { newQuestion, publicQuestion, validateQuestion, type Question } from "@/lib/question";

const poll = (text: string, profiles: string[], multiple = false): Question => ({
  ...newQuestion("poll"),
  text,
  options: profiles.map((_, i) => `Réponse ${i + 1}`),
  profiles,
  multiple,
});
const answer = (player: string, question: number, ...choices: number[]) => ({
  player,
  question,
  payload: { choices },
});

describe("quiz à profils", () => {
  const quiz = [
    poll("Face à un conflit ?", ["Directif", "Participatif", "Délégatif"]),
    poll("Pour décider ?", ["Participatif", "Directif", ""]),
    poll("Un nouveau projet ?", ["Délégatif", "Directif", "Participatif"]),
  ];

  it("lists the profiles in the order they first appear", () => {
    expect(quizProfiles(quiz)).toEqual(["Directif", "Participatif", "Délégatif"]);
    expect(isProfileQuiz(quiz)).toBe(true);
    expect(isProfileQuiz([poll("Un avis ?", ["", ""])])).toBe(false);
  });

  it("ignores profiles left on a question that is no longer a poll", () => {
    const quizQuestion = { ...newQuestion("quiz"), text: "2 + 2 ?", profiles: ["Directif", "Autre"] };
    expect(quizProfiles([quizQuestion])).toEqual([]);
    expect(validateQuestion({ ...quizQuestion, options: ["3", "4"] }).profiles).toEqual([]);
  });

  it("keeps one profile per answer and trims the names", () => {
    const checked = validateQuestion({
      ...poll("Un avis ?", [" Directif ", "Participatif"]),
      options: ["a", "b", "c"],
    });
    expect(checked.profiles).toEqual(["Directif", "Participatif", ""]);
  });

  it("refuses a single profile, too many profiles and scored questions", () => {
    expect(() => validateProfiles([poll("Seul ?", ["Directif", ""])])).toThrow(/deux profils/);
    expect(() =>
      validateProfiles([poll("Trop ?", ["a", "b", "c", "d"]), poll("Trop ?", ["e", "f", "g"])]),
    ).toThrow(/limité à 6/);
    expect(() => validateProfiles([...quiz, { ...newQuestion("quiz"), text: "2 + 2 ?" }])).toThrow(/Étape 4/);
    expect(() => validateProfiles(quiz)).not.toThrow();
    // A quiz without any profile is an ordinary quiz: nothing to check.
    expect(() => validateProfiles([{ ...newQuestion("quiz"), text: "2 + 2 ?" }])).not.toThrow();
  });

  it("never sends the profiles of the answers to the players", () => {
    expect(publicQuestion(quiz[0], false)).not.toHaveProperty("profiles");
    expect(publicQuestion(quiz[0], true)).not.toHaveProperty("profiles");
  });

  it("gives each person the profile their answers point to most often", () => {
    const answers = [
      // Ana: Directif three times.
      answer("ana", 0, 0),
      answer("ana", 1, 1),
      answer("ana", 2, 1),
      // Bob: Participatif twice, Délégatif once.
      answer("bob", 0, 1),
      answer("bob", 1, 0),
      answer("bob", 2, 0),
      // Cy: one answer for Délégatif, one that points to no profile.
      answer("cy", 0, 2),
      answer("cy", 1, 2),
    ];
    const result = profileResults(quiz, answers, "bob");
    expect(result.profiled).toBe(3);
    expect(result.tied).toBe(0);
    expect(result.shares).toEqual([
      { name: "Directif", people: 1, percent: 33 },
      { name: "Participatif", people: 1, percent: 33 },
      { name: "Délégatif", people: 1, percent: 33 },
    ]);
    expect(result.mine?.names).toEqual(["Participatif"]);
    expect(result.mine?.scores).toEqual([
      { name: "Directif", count: 0, percent: 0 },
      { name: "Participatif", count: 2, percent: 67 },
      { name: "Délégatif", count: 1, percent: 33 },
    ]);
  });

  it("counts a tie in each tied profile and leaves out people without any profile", () => {
    const answers = [
      answer("ana", 0, 0),
      answer("ana", 1, 0), // Directif 1, Participatif 1
      answer("bob", 1, 2), // points to no profile
    ];
    const result = profileResults(quiz, answers, "bob");
    expect(result.profiled).toBe(1);
    expect(result.tied).toBe(1);
    expect(result.shares.map((s) => s.people)).toEqual([1, 1, 0]);
    expect(result.shares.map((s) => s.percent)).toEqual([100, 100, 0]);
    expect(result.mine).toBeNull();
    expect(profileResults(quiz, answers, "nobody").mine).toBeNull();
  });

  it("counts every ticked answer of a multiple-choice poll", () => {
    const multi = [poll("Vos réflexes ?", ["Directif", "Directif", "Participatif"], true)];
    const result = profileResults(multi, [answer("ana", 0, 0, 1, 2)], "ana");
    expect(result.mine?.names).toEqual(["Directif"]);
    expect(result.mine?.scores.map((s) => s.count)).toEqual([2, 1]);
  });
});
