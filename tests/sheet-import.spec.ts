import { describe, expect, it } from "vitest";
import { parseCsv, readXlsx } from "@/lib/sheet";
import { importTemplate, rowsToQuestions, titleFromFile } from "@/lib/sheet-import";
import { buildXlsx } from "@/lib/xlsx";

describe("lecture des tableurs", () => {
  it("lit un CSV au point-virgule avec guillemets et retours à la ligne", () => {
    const rows = parseCsv('﻿Question;Réponse 1\r\n"Un ""vrai"" test ; oui";"ligne\nsuivante"\r\n');
    expect(rows).toEqual([
      ["Question", "Réponse 1"],
      ['Un "vrai" test ; oui', "ligne\nsuivante"],
    ]);
  });

  it("devine la virgule et la tabulation", () => {
    expect(parseCsv("a,b\n1,2")[1]).toEqual(["1", "2"]);
    expect(parseCsv("a\tb\n1\t2")[1]).toEqual(["1", "2"]);
  });

  it("refuse un fichier qui n’est pas un .xlsx", async () => {
    await expect(readXlsx(new TextEncoder().encode("pas un zip"))).rejects.toThrow(/Excel/);
  });
});

describe("import de questions", () => {
  it("importe tout le modèle sans erreur", async () => {
    const rows = await readXlsx(buildXlsx(importTemplate()));
    const { questions, skipped } = rowsToQuestions(rows);
    expect(skipped).toEqual([]);
    expect(questions.map((q) => q.type)).toEqual([
      "quiz",
      "quiz",
      "truefalse",
      "text",
      "slider",
      "puzzle",
      "poll",
      "scale",
      "wordcloud",
      "slide",
    ]);
    const [single, multi, tf, text, slider, puzzle, , scale] = questions;
    expect(single).toMatchObject({ correctAnswers: [1], multiple: false, duration: 20 });
    expect(single.explanation).toMatch(/Canberra/);
    expect(multi).toMatchObject({ correctAnswers: [0, 2], multiple: true, duration: 30 });
    expect(tf).toMatchObject({ correctAnswers: [1], points: "double" });
    expect(text.accepted).toEqual(["Au"]);
    expect(slider).toMatchObject({ min: 1950, max: 2000, target: 1969 });
    expect(puzzle.order).toEqual([0, 1, 2, 3]);
    expect(scale.max).toBe(5);
    expect(questions.filter((q) => q.anonymous).map((q) => q.type)).toEqual(["poll"]);
  });

  it("comprend le modèle de tableur de Kahoot (titre au-dessus, en-têtes en anglais)", () => {
    const rows = [
      ["Quiz template"],
      [],
      [
        "",
        "Question - max 120 characters",
        "Answer 1 - max 75 characters",
        "Answer 2 - max 75 characters",
        "Answer 3 - max 75 characters",
        "Answer 4 - max 75 characters",
        "Time limit (sec) – 5, 10, 20, 30, 60, 90, 120, or 240 secs",
        "Correct answer(s) - choose at least one",
      ],
      ["1", "2 + 2 ?", "3", "4", "5", "", "60", "2"],
      ["2", "Couleurs primaires ?", "Rouge", "Vert", "Bleu", "Jaune", "25", "1,3,4"],
    ];
    const { questions, skipped } = rowsToQuestions(rows);
    expect(skipped).toEqual([]);
    expect(questions[0]).toMatchObject({
      type: "quiz",
      options: ["3", "4", "5"],
      correctAnswers: [1],
      duration: 60,
    });
    expect(questions[1]).toMatchObject({ correctAnswers: [0, 2, 3], multiple: true, duration: 20 });
  });

  it("explique les lignes qu’il ne peut pas garder, avec leur numéro", () => {
    const rows = parseCsv(
      [
        "Type;Question;Réponse 1;Réponse 2;Bonne réponse",
        "Quiz;Sans bonne réponse ?;Oui;Non;",
        "Magie;Type inconnu ?;a;b;1",
        ";;;;",
        "Quiz;Réponse par son texte ?;Paris, France;Lyon;Paris, France",
        "Vrai ou faux;Le ciel est vert ?;;;peut-être",
        "Quiz;Une seule réponse ?;Oui;;1",
      ].join("\n"),
    );
    const { questions, skipped } = rowsToQuestions(rows);
    expect(questions.map((q) => q.correctAnswers)).toEqual([[0]]);
    expect(skipped).toEqual([
      { row: 2, reason: "bonne réponse manquante" },
      { row: 3, reason: "type « Magie » inconnu" },
      { row: 6, reason: "indiquez « Vrai » ou « Faux » comme bonne réponse" },
      { row: 7, reason: "il faut au moins 2 réponses" },
    ]);
  });

  it("garde 30 étapes au plus et compte le reste", () => {
    const rows = [["Question", "Type"], ...Array.from({ length: 34 }, (_, i) => [`Q${i}`, "Nuage de mots"])];
    const { questions, extra } = rowsToQuestions(rows);
    expect(questions).toHaveLength(30);
    expect(extra).toBe(4);
  });

  it("refuse un tableau sans colonne Question", () => {
    expect(() => rowsToQuestions([["Nom", "Prénom"]])).toThrow(/Question/);
  });

  it("tire le titre du nom du fichier", () => {
    expect(titleFromFile("Formation_sécurité 2026.xlsx")).toBe("Formation sécurité 2026");
  });
});
