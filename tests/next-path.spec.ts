import { expect, test } from "vitest";
import { safeNext } from "@/lib/next-path";

test("après connexion, on ne va que vers l’espace organisation", () => {
  expect(safeNext("/app/abonnement?offre=PRO")).toBe("/app/abonnement?offre=PRO");
  expect(safeNext("/app")).toBe("/app");
  expect(safeNext("https://evil.example")).toBe("/app");
  expect(safeNext("//evil.example/app")).toBe("/app");
  expect(safeNext("/application-piege")).toBe("/app");
  expect(safeNext(undefined)).toBe("/app");
});
