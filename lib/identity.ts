import { getSessionUser } from "@/lib/server/guard";

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

/** Secure cookies whenever the public address is HTTPS (always in production behind Nginx). */
const secure = () => (process.env.APP_URL || process.env.NEXTAUTH_URL || "").startsWith("https://");

export function identityHeaders(req: Request, who: { id: string; fresh: boolean }): Record<string, string> {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (who.fresh)
    headers["Set-Cookie"] =
      `sq_identity=${who.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure() ? "; Secure" : ""}`;
  return headers;
}
