import { expect, test } from "vitest";
import {
  EVENT_PASS,
  PLAN_KEYS,
  PLANS,
  effectivePlan,
  hasEventPass,
  limitsSummary,
  orgLimits,
  passIsUseful,
  planBadge,
  priceLabel,
} from "@/lib/plans";

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
  expect(limitsSummary(PLANS.FREE)).toBe("1 quiz, 5 joueurs par partie, 1 membre, 10 Mo de médias");
});

test("le pack événement donne les limites Premium pendant sa durée, puis rend l’offre d’origine", () => {
  const now = Date.now();
  const running = { plan: "FREE" as const, partner: false, eventPassUntil: new Date(now + 60_000) };
  const over = { ...running, eventPassUntil: new Date(now - 60_000) };
  expect(EVENT_PASS).toMatchObject({ price: 29, days: 7, plan: "PREMIUM" });
  expect(hasEventPass(running)).toBe(true);
  expect(orgLimits(running).maxPlayersPerGame).toBe(PLANS.PREMIUM.maxPlayersPerGame);
  expect(planBadge(running).label).toBe("Pack Événement");
  expect(orgLimits(over)).toBe(PLANS.FREE);
  expect(planBadge(over).label).toBe("Gratuit");
  // Dates arrive as text in the browser; no pass at all is the usual case.
  expect(effectivePlan({ ...running, eventPassUntil: running.eventPassUntil.toISOString() })).toBe("PREMIUM");
  expect(effectivePlan({ plan: "PRO", partner: false })).toBe("PRO");
  // A plan that already gives as much keeps its own name and limits.
  expect(passIsUseful("PRO")).toBe(true);
  expect(passIsUseful("PREMIUM")).toBe(false);
  expect(planBadge({ ...running, plan: "PREMIUM" }).label).toBe(PLANS.PREMIUM.label);
});
