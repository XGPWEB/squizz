import { expect, test } from "vitest";
import { PLAN_KEYS, PLANS, limitsSummary, priceLabel } from "@/lib/plans";

const unlimited = (n: number | null) => (n === null ? Infinity : n);

test("chaque offre est au moins aussi généreuse que la précédente", () => {
  for (let i = 1; i < PLAN_KEYS.length; i++) {
    const [a, b] = [PLANS[PLAN_KEYS[i - 1]], PLANS[PLAN_KEYS[i]]];
    expect(b.maxPlayersPerGame).toBeGreaterThanOrEqual(a.maxPlayersPerGame);
    expect(b.mediaBytes).toBeGreaterThanOrEqual(a.mediaBytes);
    expect(unlimited(b.maxQuizzes)).toBeGreaterThanOrEqual(unlimited(a.maxQuizzes));
    expect(unlimited(b.maxMembers)).toBeGreaterThanOrEqual(unlimited(a.maxMembers));
  }
});

test("les prix affichés sont ceux de la grille tarifaire", () => {
  expect(PLAN_KEYS.map((k) => priceLabel(PLANS[k]))).toEqual([
    "0 €",
    "15 € / mois",
    "30 € / mois",
    "310 € / an",
  ]);
  expect(PLANS.FREE.maxPlayersPerGame).toBeLessThanOrEqual(100);
  expect(limitsSummary(PLANS.FREE)).toBe("3 quiz, 20 joueurs par partie, 1 membre, 50 Mo de médias");
});
