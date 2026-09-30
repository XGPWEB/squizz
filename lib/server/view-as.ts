import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * "View as" for the super-admin: a separate, signed, 2-hour cookie naming the organisation being
 * viewed. It never replaces the NextAuth session, so the super-admin stays signed in as themself
 * and nothing done in the viewed organisation can touch their own account.
 */
export const VIEW_COOKIE = "sq_view";
export const VIEW_TTL_SECONDS = 2 * 60 * 60;

type ViewToken = { adminId: string; organizationId: string; exp: number };

/** A key derived for this purpose only, so it is never the same as the session-signing key. */
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET manquant.");
  return createHmac("sha256", s).update("squizz:view-as:v1").digest();
}
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function createViewToken(adminId: string, organizationId: string) {
  const payload = Buffer.from(
    JSON.stringify({ adminId, organizationId, exp: Math.floor(Date.now() / 1000) + VIEW_TTL_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the token only if the signature is valid, it has not expired and it belongs to this admin. */
export function readViewToken(raw: string | undefined, adminId: string): ViewToken | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const token = JSON.parse(Buffer.from(payload, "base64url").toString()) as ViewToken;
    if (token.adminId !== adminId || token.exp < Date.now() / 1000) return null;
    return token;
  } catch {
    return null;
  }
}

export const viewCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: (process.env.APP_URL || "").startsWith("https://"),
  path: "/",
  maxAge: VIEW_TTL_SECONDS,
});
