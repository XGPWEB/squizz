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

test("sondage : nombres, pourcentages, choix en tête et participation", async () => {
  const { choiceStats } = await import("@/lib/question");
  const counts = [
    { label: "A", count: 6 },
    { label: "B", count: 3 },
    { label: "C", count: 0 },
  ];
  const s = choiceStats(counts, 9, 12);
  expect(s.rows.map((r) => r.percent)).toEqual([67, 33, 0]);
  expect(s.rows.map((r) => r.leading)).toEqual([true, false, false]);
  expect(s.leaders).toEqual(["A"]);
  expect(s.participation).toBe(75);
  // Tie, and no answer at all.
  expect(
    choiceStats(
      [
        { label: "A", count: 2 },
        { label: "B", count: 2 },
      ],
      4,
    ).leaders,
  ).toEqual(["A", "B"]);
  const empty = choiceStats(
    counts.map((c) => ({ ...c, count: 0 })),
    0,
    5,
  );
  expect(empty.leaders).toEqual([]);
  expect(empty.rows.every((r) => r.percent === 0 && !r.leading)).toBe(true);
  expect(empty.participation).toBe(0);
});

test("lien collé : le type du média se déduit de l’adresse quand elle le dit", async () => {
  const { guessMediaKind } = await import("@/lib/question");
  expect(guessMediaKind("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
  expect(guessMediaKind("https://youtu.be/dQw4w9WgXcQ?t=43")).toBe("youtube");
  expect(guessMediaKind(" https://exemple.fr/photos/Chat.JPG?taille=800 ")).toBe("image");
  expect(guessMediaKind("https://exemple.fr/a.webp")).toBe("image");
  expect(guessMediaKind("https://exemple.fr/film.mp4")).toBe("video");
  expect(guessMediaKind("https://exemple.fr/extrait.mp3")).toBe("audio");
  // Rien ne le dit : une page web, une image servie sans extension, une saisie en cours.
  expect(guessMediaKind("https://exemple.fr/article")).toBeNull();
  expect(guessMediaKind("https://images.exemple.fr/photo-123?w=800")).toBeNull();
  expect(guessMediaKind("https://exe")).toBeNull();
  expect(guessMediaKind("pas une adresse")).toBeNull();
});
