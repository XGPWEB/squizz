import "server-only";
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    /** Extra fields sent with the error (e.g. the other version of a quiz on an edit conflict). */
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export function fail(message: string, status = 400, details?: Record<string, unknown>): never {
  throw new HttpError(message, status, details);
}

/** Runs a validator and turns its error into a 400 with the same message. */
export function validated<T>(check: () => T): T {
  try {
    return check();
  } catch (e) {
    fail((e as Error).message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, validated by each action
export type Body = Record<string, any>;

export async function readBody(req: Request): Promise<Body> {
  let body: unknown;
  if (req.method === "POST") assertJson(req);
  try {
    body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
  } catch {
    fail("Requête invalide.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("Requête invalide.");
  return body as Body;
}

/**
 * CSRF defence in depth (on top of SameSite cookies): a request that changes something must come
 * from this site. Browsers always send Origin on cross-site POSTs; tools and tests send none.
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    // malformed Origin: rejected below
  }
  if (!host || originHost !== host) fail("Requête refusée.", 403);
}

/** JSON bodies only: an HTML form from another site cannot send application/json. */
export function assertJson(req: Request) {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json"))
    fail("Format de requête non pris en charge.", 415);
}
