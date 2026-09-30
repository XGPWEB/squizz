/**
 * The request may or may not have reached the server (timeout, lost connection, gateway error): the
 * caller must check the real state before retrying, or retry only an action that is safe to repeat.
 */
export class UncertainError extends Error {
  constructor(message = "La connexion est lente ou coupée : impossible de savoir si l’action a abouti.") {
    super(message);
    this.name = "UncertainError";
  }
}

/** A refusal from the server, with its French message and any extra fields (e.g. `conflict`). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Default wait before giving up on an action; uploads pass a longer one. */
export const TIMEOUT_MS = 15_000;

/** A fresh idempotency key: send the same one when retrying the same action. */
export const newClientKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

async function request<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    // Timeout (AbortError/TimeoutError) or network failure (TypeError): the outcome is unknown.
    throw new UncertainError();
  }
  const out = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  // Gateway errors (Nginx page, no JSON from SQuizz): the action may still have run.
  if (res.status === 502 || res.status === 504 || (!res.ok && !out)) throw new UncertainError();
  if (!res.ok) throw new ApiError(String(out?.error || "Une erreur est survenue."), res.status, out ?? {});
  return (out ?? {}) as T;
}

/** Calls the game API and throws the server's French error message on failure. */
export async function gameApi<T = Record<string, unknown>>(
  action: string,
  data: Record<string, unknown> = {},
  timeoutMs = TIMEOUT_MS,
) {
  return postJson<T>("/api/game", { action, ...data }, "POST", timeoutMs);
}

export async function postJson<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
  method = "POST",
  timeoutMs = TIMEOUT_MS,
): Promise<T> {
  return request<T>(
    url,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    timeoutMs,
  );
}

export async function getJson<T>(url: string, timeoutMs = TIMEOUT_MS): Promise<T> {
  return request<T>(url, { cache: "no-store" }, timeoutMs);
}

/**
 * Runs an action that is safe to repeat (it carries an idempotency key, a version or a question index):
 * after an uncertain result it is sent once more, then the uncertainty is reported.
 */
export async function withRetry<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (e) {
    if (!(e instanceof UncertainError)) throw e;
    return action();
  }
}
