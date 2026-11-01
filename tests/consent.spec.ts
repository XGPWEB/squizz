import { expect, test } from "vitest";
import { CONSENT_COOKIE, CONSENT_VERSION, consentCookie, makeConsent, readConsent } from "@/lib/consent";

test("le choix est lu tel qu’il a été enregistré, et refusé par défaut", () => {
  expect(readConsent("")).toBeNull();
  expect(readConsent("autre=1")).toBeNull();
  const all = consentCookie(makeConsent("all"), true).split(";")[0];
  expect(readConsent(`a=b; ${all}`)?.services.youtube).toBe(true);
  expect(readConsent(consentCookie(makeConsent("none"), false).split(";")[0])?.services.youtube).toBe(false);
  expect(makeConsent({}).services.youtube).toBe(false);
  expect(consentCookie(makeConsent("all"), true)).toMatch(/Max-Age=15552000; SameSite=Lax; Secure$/);
});

test("un choix trop ancien, d’une autre version ou illisible est redemandé", () => {
  const cookie = (value: object) => `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}`;
  const old = new Date(Date.now() - 200 * 86400_000).toISOString();
  expect(readConsent(cookie({ v: CONSENT_VERSION, at: old, services: { youtube: true } }))).toBeNull();
  // A choice made before the audience measurement existed never counts as consent to it.
  expect(readConsent(cookie({ v: 1, at: new Date().toISOString(), services: { youtube: true } }))).toBeNull();
  expect(readConsent(`${CONSENT_COOKIE}=%7Bpas-du-json`)).toBeNull();
  // An unknown service in an old cookie is ignored; a missing one is refused.
  const odd = readConsent(
    cookie({ v: CONSENT_VERSION, at: new Date().toISOString(), services: { pub: true } }),
  );
  expect(odd?.services).toEqual({ audience: false, youtube: false });
});
