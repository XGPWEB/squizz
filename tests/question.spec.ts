import { describe, expect, test } from "vitest";
import { newQuestion, publicQuestion, validateQuestion } from "@/lib/question";

describe("explication de la réponse", () => {
  const q = {
    ...newQuestion("quiz"),
    text: "Capitale de l’Australie ?",
    options: ["Sydney", "Canberra", "Melbourne", "Perth"],
    correctAnswers: [1],
    correct: 1,
    explanation: "  Canberra est un compromis entre Sydney et Melbourne.  ",
  };
  test("cachée aux joueurs tant que la correction n’est pas affichée", () => {
    expect(publicQuestion(q, false)).not.toHaveProperty("explanation");
    expect(publicQuestion(q, true).explanation).toContain("Canberra");
  });
  test("facultative, nettoyée et limitée à 600 caractères", () => {
    expect(validateQuestion(q).explanation).toBe("Canberra est un compromis entre Sydney et Melbourne.");
    expect(validateQuestion({ ...q, explanation: undefined }).explanation).toBe("");
    expect(() => validateQuestion({ ...q, explanation: "x".repeat(601) })).toThrow(/600/);
  });
});
