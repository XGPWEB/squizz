export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function fail(message: string, status = 400): never {
  throw new HttpError(message, status);
}

/** Runs a validator and turns its error into a 400 with the same message. */
export function validated<T>(check: () => T): T {
  try {
    return check();
  } catch (e) {
    fail((e as Error).message);
  }
}

export type Body = Record<string, any>;

export async function readBody(req: Request): Promise<Body> {
  let body: unknown;
  try {
    body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
  } catch {
    fail("Requête invalide.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("Requête invalide.");
  return body as Body;
}
