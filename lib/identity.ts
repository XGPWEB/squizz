export function identity(req: Request) {
  const cookie = req.headers.get("cookie")?.match(/(?:^|; )sq_identity=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return {
    id: req.headers.get("oai-authenticated-user-id") || cookie || crypto.randomUUID(),
    fresh: !cookie && !req.headers.get("oai-authenticated-user-id"),
  };
}
export function identityHeaders(req: Request, who: ReturnType<typeof identity>): Record<string, string> {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (who.fresh)
    headers["Set-Cookie"] =
      `sq_identity=${who.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
  return headers;
}
