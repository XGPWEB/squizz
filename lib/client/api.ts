/** Calls the game API and throws the server's French error message on failure. */
export async function gameApi<T = Record<string, unknown>>(
  action: string,
  data: Record<string, unknown> = {},
) {
  return postJson<T>("/api/game", { action, ...data });
}

export async function postJson<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out as { error?: string }).error || "Une erreur est survenue.");
  return out as T;
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((out as { error?: string }).error || "Une erreur est survenue.");
  return out as T;
}
