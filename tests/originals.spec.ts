import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { demos } from "@/lib/quizzes";
import { safeMediaUrl, validateQuestion } from "@/lib/question";
import { isProfileQuiz, validateProfiles } from "@/lib/profiles";

test("chaque SQuizz Original respecte les règles de l’éditeur (copiable tel quel)", () => {
  for (const quiz of demos)
    quiz.questions.forEach((q, i) =>
      expect(() => validateQuestion(q), `${quiz.id} n° ${i + 1}`).not.toThrow(),
    );
  expect(new Set(demos.map((q) => q.id)).size).toBe(demos.length);
});

test("les illustrations des Originals existent et restent limitées à leur dossier", () => {
  for (const quiz of demos)
    for (const q of quiz.questions)
      for (const m of q.media)
        if (m.url.startsWith("/originals/"))
          expect(existsSync(path.join(import.meta.dirname, "..", "public", m.url)), m.url).toBe(true);
  expect(safeMediaUrl("/originals/management-fpt/code.webp")).toBe(true);
  expect(safeMediaUrl("/originals/blind-test/extrait-1.mp3")).toBe(true);
  expect(safeMediaUrl("/originals/espace/alunissage.mp4")).toBe(true);
  expect(safeMediaUrl("/originals/espace/script.js")).toBe(false);
  expect(safeMediaUrl("/originals/../.env")).toBe(false);
  expect(safeMediaUrl("/api/admin/audit")).toBe(false);
});

test("les Originals à profils respectent les règles des quiz à profils", () => {
  const profiled = demos.filter((quiz) => isProfileQuiz(quiz.questions));
  expect(profiled.map((quiz) => quiz.id)).toContain("modele-profils");
  for (const quiz of profiled) expect(() => validateProfiles(quiz.questions), quiz.id).not.toThrow();
});
