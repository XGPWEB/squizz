import { describe, expect, test } from "vitest";
import {
  changeType,
  losesContent,
  newQuestion,
  publicQuestion,
  restoreType,
  validateQuestion,
} from "@/lib/question";

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

describe("changement de type d’une question", () => {
  const quiz = {
    ...newQuestion("quiz"),
    text: "Capitale de la France ?",
    options: ["Lyon", "Paris", "Lille", "Bordeaux"],
    correct: 1,
    correctAnswers: [1],
    explanation: "Depuis longtemps.",
    duration: 45,
  };
  test("quiz en sondage : les réponses restent, et le retour au quiz retrouve la bonne réponse", () => {
    const poll = changeType(quiz, "poll");
    expect(poll.type).toBe("poll");
    expect(poll.points).toBe("none");
    expect(poll.options).toEqual(quiz.options);
    expect(poll.explanation).toBe(quiz.explanation);
    expect(poll.duration).toBe(45);
    expect(losesContent(quiz, "poll")).toBe(false);
    expect(changeType(poll, "quiz")).toEqual(quiz);
    expect(() => validateQuestion(poll)).not.toThrow();
  });
  test("vers le puzzle : l’ordre suit le nombre de réponses", () => {
    const puzzle = changeType({ ...quiz, options: ["A", "B", "C", "D", "E"] }, "puzzle");
    expect(puzzle.order).toEqual([0, 1, 2, 3, 4]);
    expect(() => validateQuestion(puzzle)).not.toThrow();
  });
  test("une bonne réponse retirée entre-temps ne laisse pas de question invalide", () => {
    const poll = { ...changeType(quiz, "poll"), options: ["Lyon", "Paris"], correctAnswers: [3] };
    expect(changeType(poll, "quiz").correctAnswers).toEqual([0]);
  });
  test("ce que le nouveau type ne sait pas garder est signalé et se restaure", () => {
    expect(losesContent(quiz, "truefalse")).toBe(true);
    expect(losesContent(quiz, "open")).toBe(true);
    const open = { ...changeType(quiz, "open"), text: "Capitale ?" };
    const back = restoreType(quiz, open);
    expect(back.options).toEqual(quiz.options);
    expect(back.correctAnswers).toEqual([1]);
    expect(back.text).toBe("Capitale ?");
  });
  test("une étape encore vierge ne perd rien, quel que soit le type", () => {
    for (const t of ["poll", "text", "slider", "scale", "pin", "open", "slide"] as const)
      expect(losesContent(newQuestion("quiz"), t)).toBe(false);
  });
  test("réponses acceptées, repère et texte de diapo suivent les types voisins", () => {
    const text = { ...newQuestion("text"), accepted: ["Paris"] };
    expect(changeType(text, "blindtest").accepted).toEqual(["Paris"]);
    const pin = { ...newQuestion("pin"), pin: { x: 0.2, y: 0.3, radius: 0.1 } };
    expect(changeType(pin, "pinpoll").pin).toEqual(pin.pin);
    const slide = { ...newQuestion("slide"), body: "Bienvenue" };
    expect(changeType(slide, "slide", "quote").body).toBe("Bienvenue");
    expect(changeType(slide, "slide", "quote").layout).toBe("quote");
  });
  test("quitter un sondage retire ses profils, et c’est signalé", () => {
    const poll = { ...newQuestion("poll"), profiles: ["Sage", "", "Fou", ""] };
    expect(changeType(poll, "puzzle").profiles).toEqual([]);
    expect(losesContent(poll, "puzzle")).toBe(true);
  });
});
