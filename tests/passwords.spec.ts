import bcrypt from "bcryptjs";
import { expect, test, vi } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";

// bcrypt is slow on purpose: leave room when the machine is busy (deploy checks, CI).
vi.setConfig({ testTimeout: 30_000 });

const base = "A".repeat(72);

test("deux mots de passe différents restent différents, même au-delà de 72 octets", async () => {
  const hash = await hashPassword(`${base}-original`);
  expect((await verifyPassword(`${base}-original`, hash)).ok).toBe(true);
  expect((await verifyPassword(`${base}-different`, hash)).ok).toBe(false);
  expect((await verifyPassword(base, hash)).ok).toBe(false);
  // Exactly 72 bytes stored: a longer attempt with the same beginning is refused too.
  const exact = await hashPassword(base);
  expect((await verifyPassword(`${base}x`, exact)).ok).toBe(false);
  expect((await verifyPassword(base, exact)).ok).toBe(true);
}, 20_000);

test("les caractères accentués et les émojis comptent en entier", async () => {
  // 30 characters of 3 bytes each: 90 bytes, beyond what bcrypt alone would read.
  const long = "é€✓".repeat(10) + "∞".repeat(10);
  const hash = await hashPassword(`${long}🙂`);
  expect((await verifyPassword(`${long}🙂`, hash)).ok).toBe(true);
  expect((await verifyPassword(`${long}🙃`, hash)).ok).toBe(false);
  expect((await verifyPassword("Motdepasse-été-2026", await hashPassword("Motdepasse-été-2026"))).ok).toBe(
    true,
  );
}, 20_000);

test("les comptes existants (ancien hachage) se connectent encore, puis sont mis à niveau", async () => {
  const legacy = await bcrypt.hash("Ancien-motdepasse-42", 12);
  expect(await verifyPassword("Ancien-motdepasse-42", legacy)).toEqual({ ok: true, upgrade: true });
  expect(await verifyPassword("mauvais", legacy)).toEqual({ ok: false, upgrade: false });
  // Once stored again in the current scheme, it is compared exactly and needs no further upgrade.
  const upgraded = await hashPassword("Ancien-motdepasse-42");
  expect(upgraded.startsWith("v2$")).toBe(true);
  expect(await verifyPassword("Ancien-motdepasse-42", upgraded)).toEqual({ ok: true, upgrade: false });
}, 20_000);
