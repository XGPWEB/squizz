import { expect, test } from "vitest";
import { estimateLabel, estimateSeconds } from "@/lib/quiz-duration";

test("la durée estimée suit les réglages réels des étapes", () => {
  // Question de 20 s : 2 s de « Prêt ? » + 20 s + 20 s de résultats ; diapo : 2 s + 20 s de lecture.
  expect(estimateSeconds([{ type: "quiz", duration: 20 }])).toBe(42);
  expect(estimateSeconds([{ type: "slide", duration: 20 }])).toBe(22);
  const long = Array.from({ length: 10 }, () => ({ type: "quiz" as const, duration: 60 }));
  expect(estimateLabel(long)).toBe("~ 14 min");
  expect(estimateLabel([{ type: "quiz", duration: 5 }])).toBe("~ 1 min");
});
