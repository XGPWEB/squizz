import { env } from "cloudflare:workers";

const SITES_USER_HEADER = "oai-authenticated-user-id";

/**
 * The Sites proxy sets this header after sign-in, and the local dev plugin strips any
 * client-supplied copy. Anywhere else a visitor could forge it and impersonate someone,
 * so production only trusts it when TRUST_SITES_IDENTITY is explicitly enabled.
 */
function trustsSitesHeader() {
  return import.meta.env.DEV || env.TRUST_SITES_IDENTITY === "true";
}

export function identity(req: Request) {
  const cookie = req.headers.get("cookie")?.match(/(?:^|; )sq_identity=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const sitesUser = trustsSitesHeader() ? req.headers.get(SITES_USER_HEADER) : null;
  return {
    id: sitesUser || cookie || crypto.randomUUID(),
    fresh: !cookie && !sitesUser,
  };
}

export function identityHeaders(req: Request, who: ReturnType<typeof identity>): Record<string, string> {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (who.fresh)
    headers["Set-Cookie"] =
      `sq_identity=${who.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
  return headers;
}
