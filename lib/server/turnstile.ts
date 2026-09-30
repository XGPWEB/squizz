import "server-only";
/**
 * Cloudflare Turnstile verification. Without TURNSTILE_SECRET_KEY the check is skipped
 * (development), the honeypot and rate limit still apply.
 */
export const turnstileSiteKey = () => process.env.TURNSTILE_SITE_KEY || "";

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch (err) {
    console.error("[turnstile] échec de vérification :", err);
    return false;
  }
}
