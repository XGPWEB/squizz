import "server-only";
import { decode, encode } from "next-auth/jwt";

/**
 * The super-admin space has its own session cookie, separate from the client one (NextAuth), so
 * the same browser can be signed in to a personal client account and to the super-admin at once.
 * Shorter-lived than client sessions, and signed with its own salt so neither token can pass for
 * the other.
 */
const secure = () => (process.env.APP_URL || "").startsWith("https://");
export const adminCookieName = () => (secure() ? "__Secure-squizz-admin" : "squizz-admin");
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
const SALT = "squizz:super-admin:v1";

type AdminToken = { id: string; sessionVersion: number };

export async function createAdminToken(user: AdminToken) {
  return encode({
    token: { id: user.id, sessionVersion: user.sessionVersion },
    secret: process.env.AUTH_SECRET!,
    salt: SALT,
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export async function readAdminToken(raw: string | undefined): Promise<AdminToken | null> {
  if (!raw) return null;
  const token = await decode({ token: raw, secret: process.env.AUTH_SECRET!, salt: SALT }).catch(() => null);
  return typeof token?.id === "string" && typeof token.sessionVersion === "number"
    ? { id: token.id, sessionVersion: token.sessionVersion }
    : null;
}

export const adminCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: secure(),
  path: "/",
  maxAge: ADMIN_SESSION_SECONDS,
});
