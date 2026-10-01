import "server-only";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/server/guard";
import { adminCookieName, readAdminToken } from "@/lib/server/admin-session";
import { sessionAlive } from "@/lib/server/session-check";

/** Anonymous players are only remembered for 48 hours: games last at most 24. */
/**
 * Who is playing: the signed-in user when there is one (a host can also play),
 * otherwise an anonymous player remembered by an HttpOnly cookie.
 */
export async function identity(req: Request) {
  const user = await getSessionUser();
  if (user) return { id: user.id, fresh: false, user };
  const cookie = req.headers.get("cookie")?.match(/(?:^|; )sq_identity=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return { id: cookie || crypto.randomUUID(), fresh: !cookie, user: null };
}

/**
 * Polling-only variant: decodes the session token instead of loading the whole session, and checks that it
 * has not been revoked (password change, deactivation, suspension, sign-out everywhere) through a short
 * bounded cache — see lib/server/session-check.ts. A revoked session is treated as an anonymous visitor.
 * Enough to recognise a host or signed-in player; never used to change anything.
 */
export async function lightIdentity(req: Request) {
  // A super-admin viewing an organisation hosts its games under their own super-admin identity.
  const cookies = req.headers.get("cookie") ?? "";
  if (/(?:^|; )sq_view=/.test(cookies)) {
    const raw = cookies.match(new RegExp(`(?:^|; )${adminCookieName()}=([^;]+)`))?.[1];
    const admin = await readAdminToken(raw);
    if (admin && (await sessionAlive(admin.id, admin.sessionVersion, true)))
      return { id: admin.id, fresh: false, user: null };
  }
  const token = await getToken({ req: req as NextRequest, secret: process.env.AUTH_SECRET }).catch(
    () => null,
  );
  if (typeof token?.id === "string" && (await sessionAlive(token.id, token.sessionVersion)))
    return { id: token.id, fresh: false, user: null };
  const cookie = req.headers.get("cookie")?.match(/(?:^|; )sq_identity=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return { id: cookie || crypto.randomUUID(), fresh: !cookie, user: null };
}
/** Secure cookies whenever the public address is HTTPS (always in production behind Nginx). */
const secure = () => (process.env.APP_URL || process.env.NEXTAUTH_URL || "").startsWith("https://");

export function identityHeaders(req: Request, who: { id: string; fresh: boolean }): Record<string, string> {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (who.fresh)
    headers["Set-Cookie"] =
      `sq_identity=${who.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=172800${secure() ? "; Secure" : ""}`;
  return headers;
}
