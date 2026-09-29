import { expect, test } from "vitest";
import { PLANS } from "@/lib/plans";

test("l’offre Pro est au moins aussi généreuse que l’offre Gratuite", () => {
  const { FREE, PRO } = PLANS;
  expect(PRO.maxPlayersPerGame).toBeGreaterThanOrEqual(FREE.maxPlayersPerGame);
  expect(PRO.mediaBytes).toBeGreaterThanOrEqual(FREE.mediaBytes);
  expect(PRO.maxQuizzes).toBeNull();
  expect(PRO.maxMembers).toBeNull();
  expect(FREE.maxPlayersPerGame).toBeLessThanOrEqual(100);
});
