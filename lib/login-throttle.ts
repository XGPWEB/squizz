/**
 * Sign-in throttling rules (pure, unit-tested). No account is ever locked by others:
 * - one address guessing one account: 8 failures per 15 minutes;
 * - one address overall: 30 attempts per 15 minutes;
 * - one account from everywhere: 60 failures per 15 minutes, against attacks spread over many addresses,
 *   except from an address where the owner already signed in successfully (last 90 days). A third party
 *   can therefore slow down new devices for a while, but never lock the owner out of their usual ones,
 *   and « mot de passe oublié » always works.
 */
export const LOGIN_WINDOW_S = 15 * 60;
export const KNOWN_DEVICE_S = 90 * 86400;
export const LOGIN_LIMITS = { pairFailures: 8, ipAttempts: 30, accountFailures: 60 };

export type LoginCounters = {
  pairFailures: number;
  ipAttempts: number;
  accountFailures: number;
  known: boolean;
};

/** The French message to show, or null when the attempt may go ahead. `scale` loosens limits in dev. */
export function loginRefusal(c: LoginCounters, scale = 1): string | null {
  if (c.pairFailures >= LOGIN_LIMITS.pairFailures * scale)
    return "Trop de tentatives. Réessayez dans 15 minutes.";
  if (c.ipAttempts >= LOGIN_LIMITS.ipAttempts * scale)
    return "Trop de tentatives depuis votre adresse. Réessayez plus tard.";
  if (!c.known && c.accountFailures >= LOGIN_LIMITS.accountFailures * scale)
    return "Trop de tentatives sur ce compte depuis d’autres appareils. Réessayez dans 15 minutes, ou utilisez « Mot de passe oublié ».";
  return null;
}
