import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/server/guard";

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
 * Polling-only variant: decodes the session token without the database round-trips of a full
 * session check. Enough to recognise a host or signed-in player; never used to change anything.
 */
export async function lightIdentity(req: Request) {
  const token = await getToken({ req: req as NextRequest, secret: process.env.AUTH_SECRET }).catch(
    () => null,
  );
  if (typeof token?.id === "string") return { id: token.id, fresh: false, user: null };
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
