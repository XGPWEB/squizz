import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Encrypts the secrets SQuizz keeps for an organisation (its AI provider key) with AES-256-GCM. The key
 * comes from AI_KEY_SECRET (32 bytes, base64) in /opt/squizz-secrets.env, never from the database: a copy
 * of the database alone cannot reveal them. Without it, the feature stays off.
 */
const masterKey = () => {
  const raw = process.env.AI_KEY_SECRET;
  const key = raw ? Buffer.from(raw, "base64") : null;
  return key && key.length === 32 ? key : null;
};

export const secretsReady = () => !!masterKey();

export function seal(plain: string): string {
  const key = masterKey();
  if (!key) throw new Error("AI_KEY_SECRET manquant ou invalide.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(
    ":",
  );
}

export function open(sealed: string): string {
  const key = masterKey();
  const [version, iv, tag, data] = sealed.split(":");
  if (!key || version !== "v1" || !iv || !tag || !data) throw new Error("Secret illisible.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}
