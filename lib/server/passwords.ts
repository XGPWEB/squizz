import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * Password hashing. bcrypt only reads the first 72 bytes of what it is given: used directly, two long
 * passwords that differ after that point would be the same password. So the password is first reduced to
 * its SHA-256 digest (base64, 44 characters), and bcrypt hashes that: every byte of the password counts,
 * whatever its length or alphabet.
 *
 * Stored hashes of this scheme start with « v2$ ». Hashes written before it (plain bcrypt) still verify
 * the old way, so existing accounts keep signing in; `upgrade` then asks the caller to store the password
 * again in the new scheme, after which it is compared exactly.
 */
const V2 = "v2$";
const ROUNDS = 12;
const digest = (password: string) => createHash("sha256").update(password, "utf8").digest("base64");

export async function hashPassword(password: string) {
  return V2 + (await bcrypt.hash(digest(password), ROUNDS));
}
export const hashPasswordSync = (password: string) => V2 + bcrypt.hashSync(digest(password), ROUNDS);

export async function verifyPassword(password: string, stored: string) {
  if (stored.startsWith(V2))
    return { ok: await bcrypt.compare(digest(password), stored.slice(V2.length)), upgrade: false };
  const ok = await bcrypt.compare(password, stored);
  return { ok, upgrade: ok };
}
