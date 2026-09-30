import { expect, test } from "vitest";
import { LOGIN_LIMITS, loginRefusal } from "@/lib/login-throttle";

const base = { pairFailures: 0, ipAttempts: 0, accountFailures: 0, known: false };

test("un tiers ne bloque jamais le propriétaire sur un appareil déjà utilisé", () => {
  const attacked = { ...base, accountFailures: 10_000 };
  expect(loginRefusal({ ...attacked, known: true })).toBeNull();
  // A new device waits until the attack window is over.
  expect(loginRefusal(attacked)).toMatch(/autres appareils/);
});

test("les protections contre la force brute restent actives", () => {
  expect(loginRefusal({ ...base, pairFailures: LOGIN_LIMITS.pairFailures, known: true })).toMatch(
    /15 minutes/,
  );
  expect(loginRefusal({ ...base, ipAttempts: LOGIN_LIMITS.ipAttempts, known: true })).toMatch(/adresse/);
  expect(loginRefusal({ ...base, pairFailures: LOGIN_LIMITS.pairFailures - 1 })).toBeNull();
  // The development scale loosens every limit alike.
  expect(loginRefusal({ ...base, pairFailures: LOGIN_LIMITS.pairFailures }, 100)).toBeNull();
});
