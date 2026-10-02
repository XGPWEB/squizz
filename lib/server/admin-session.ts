import "server-only";
import { decode, encode } from "next-auth/jwt";

/**
 * The super-admin space has its own session cookie, separate from the client one (NextAuth), so
 * the same browser can be signed in to a personal client account and to the super-admin at once.
 * Signed with its own salt so neither token can pass for the other.
 *
 * It closes after ADMIN_SESSION_SECONDS without activity: while the super-admin is at work, the browser
 * asks for a fresh cookie (components/site/admin-keep-alive.tsx, PUT /api/admin/session). Whatever the
 * activity, the password is asked again ADMIN_SESSION_MAX_SECONDS after it was last typed.
 */
const secure = () => (process.env.APP_URL || "").startsWith("https://");
export const adminCookieName = () => (secure() ? "__Secure-squizz-admin" : "squizz-admin");
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
export const ADMIN_SESSION_MAX_SECONDS = 7 * 24 * 60 * 60;
const SALT = "squizz:super-admin:v1";

/** `since`: when the password was typed, in seconds; kept unchanged each time the cookie is renewed. */
type AdminToken = { id: string; sessionVersion: number; since: number };

const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function createAdminToken(user: Omit<AdminToken, "since"> & { since?: number }) {
  return encode({
    token: { id: user.id, sessionVersion: user.sessionVersion, since: user.since ?? nowSeconds() },
    secret: process.env.AUTH_SECRET!,
    salt: SALT,
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export async function readAdminToken(raw: string | undefined): Promise<AdminToken | null> {
  if (!raw) return null;
  const token = await decode({ token: raw, secret: process.env.AUTH_SECRET!, salt: SALT }).catch(() => null);
  if (typeof token?.id !== "string" || typeof token.sessionVersion !== "number") return null;
  // Cookies from before renewal existed carry no sign-in date: their creation date stands for it.
  const since =
    typeof token.since === "number" ? token.since : typeof token.iat === "number" ? token.iat : nowSeconds();
  if (nowSeconds() - since > ADMIN_SESSION_MAX_SECONDS) return null;
  return { id: token.id, sessionVersion: token.sessionVersion, since };
}

export const adminCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: secure(),
  path: "/",
  maxAge: ADMIN_SESSION_SECONDS,
});
