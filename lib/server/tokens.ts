import { createHash, randomBytes } from "node:crypto";

/** A random URL-safe token and the hash we store; only the hash ever reaches the database. */
export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
