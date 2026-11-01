/**
 * Cookie consent. SQuizz's own cookies are strictly necessary (sign-in, security, anonymous player id) and
 * need no consent. Consent is asked for third parties that deposit their own trackers when they load: Google
 * Analytics on the public pages, and YouTube videos embedded in quizzes. The choice is kept 6 months in a
 * first-party cookie, then asked again (CNIL recommendation), and can be changed at any time (« Gérer les
 * cookies »).
 */
export const CONSENT_COOKIE = "sq_consent";
export const CONSENT_VERSION = 2;
export const CONSENT_MONTHS = 6;

/** Optional services, each refused by default. Add new ones here and bump CONSENT_VERSION. */
export const SERVICES = [
  {
    id: "audience",
    label: "Mesure d’audience",
    provider: "Google Ireland Ltd.",
    purpose:
      "Compter les visites des pages publiques du site avec Google Analytics, pour savoir comment il est trouvé et ce qui vous intéresse. Jamais pendant une partie, ni dans les espaces connectés. Google reçoit votre adresse IP et dépose ses cookies pour 13 mois au plus.",
  },
  {
    id: "youtube",
    label: "Vidéos YouTube",
    provider: "Google Ireland Ltd.",
    purpose:
      "Lire les vidéos YouTube insérées dans certains quiz. En les affichant, YouTube (Google) reçoit votre adresse IP et peut déposer ses propres cookies.",
  },
] as const;
export type ServiceId = (typeof SERVICES)[number]["id"];

export type Consent = { v: number; at: string; services: Record<ServiceId, boolean> };

const empty = (): Record<ServiceId, boolean> =>
  Object.fromEntries(SERVICES.map((s) => [s.id, false])) as Record<ServiceId, boolean>;

/** Builds a choice: everything accepted, everything refused, or a selection. */
export function makeConsent(choice: "all" | "none" | Partial<Record<ServiceId, boolean>>): Consent {
  const services = empty();
  for (const s of SERVICES)
    services[s.id] = choice === "all" ? true : choice === "none" ? false : choice[s.id] === true;
  return { v: CONSENT_VERSION, at: new Date().toISOString(), services };
}

/** Reads the choice from a Cookie header or document.cookie; null when never made, outdated or expired. */
export function readConsent(cookies: string | null | undefined): Consent | null {
  const raw = cookies?.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`))?.[1];
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw)) as Consent;
    if (c.v !== CONSENT_VERSION || typeof c.at !== "string" || !c.services) return null;
    const age = Date.now() - new Date(c.at).getTime();
    if (!(age >= 0 && age < CONSENT_MONTHS * 31 * 86400_000)) return null;
    return { v: c.v, at: c.at, services: { ...empty(), ...makeConsent(c.services).services } };
  } catch {
    return null;
  }
}

/** The Set-Cookie value storing a choice for 6 months (first-party, readable by the page). */
export function consentCookie(consent: Consent, secure: boolean) {
  const maxAge = CONSENT_MONTHS * 30 * 86400;
  return `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
