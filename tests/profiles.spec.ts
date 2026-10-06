import { describe, expect, it } from "vitest";
import {
  isProfileQuiz,
  leadingProfiles,
  profileResults,
  quizProfiles,
  validateProfiles,
} from "@/lib/profiles";
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

  it("adds up the answers of the whole group, never per person", () => {
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
    const result = profileResults(quiz, answers);
    expect(result).toEqual({
      shares: [
        { name: "Directif", votes: 3, percent: 43 },
        { name: "Participatif", votes: 2, percent: 29 },
        { name: "Délégatif", votes: 2, percent: 29 },
      ],
      total: 7,
      voters: 3,
    });
    expect(leadingProfiles(result.shares)).toEqual(["Directif"]);
  });

  it("names every profile tied in the lead and leaves out answers that point to no profile", () => {
    const answers = [
      answer("ana", 0, 0),
      answer("ana", 1, 0), // Directif 1, Participatif 1
      answer("bob", 1, 2), // points to no profile
    ];
    const result = profileResults(quiz, answers);
    expect(result.shares.map((s) => s.votes)).toEqual([1, 1, 0]);
    expect(result.shares.map((s) => s.percent)).toEqual([50, 50, 0]);
    expect(result.total).toBe(2);
    expect(result.voters).toBe(1);
    expect(leadingProfiles(result.shares)).toEqual(["Directif", "Participatif"]);
    expect(leadingProfiles(profileResults(quiz, []).shares)).toEqual([]);
  });

  it("counts every ticked answer of a multiple-choice poll", () => {
    const multi = [poll("Vos réflexes ?", ["Directif", "Directif", "Participatif"], true)];
    const result = profileResults(multi, [answer("ana", 0, 0, 1, 2)]);
    expect(result.shares.map((s) => s.votes)).toEqual([2, 1]);
    expect(result.voters).toBe(1);
  });
});
