import { cookies } from "next/headers";
import { z } from "zod";
import { route, json } from "@/lib/server/api";
import { verifyCredentials } from "@/lib/server/credentials";
import {
  adminCookieName,
  adminCookieOptions,
  createAdminToken,
  readAdminToken,
} from "@/lib/server/admin-session";
import { requireSuperAdmin } from "@/lib/server/guard";
import { VIEW_COOKIE } from "@/lib/server/view-as";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";

const schema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  password: z.string().min(1, "Indiquez votre mot de passe."),
});

/**
 * Super-admin sign-in, separate from the client sign-in: it sets its own cookie and never touches
 * the client session, so both can coexist in one browser.
 */
export const POST = route(async (req) => {
  const input = await json(req, schema);
  const user = await verifyCredentials(input.email, input.password, req.headers).catch((e: Error) =>
    fail(e.message, 429),
  );
  // Same message for a wrong password and for a valid client account: nothing to learn here.
  if (!user || user.role !== "SUPER_ADMIN") fail("Email ou mot de passe incorrect.", 401);
  const jar = await cookies();
  jar.set(adminCookieName(), await createAdminToken(user), adminCookieOptions());
  jar.delete(VIEW_COOKIE);
  await audit(user, "super_admin.login", null);
  return { ok: true };
});

/**
 * Keeps the session open while the super-admin is at work: a new cookie with a fresh idle delay and the
 * same sign-in date, so the 7-day limit still applies. Refused once the session is over or revoked.
 */
export const PUT = route(async () => {
  await requireSuperAdmin();
  const jar = await cookies();
  const token = await readAdminToken(jar.get(adminCookieName())?.value);
  if (!token) fail("Connectez-vous pour continuer.", 401);
  jar.set(adminCookieName(), await createAdminToken(token), adminCookieOptions());
  return { ok: true };
});

/** Signs out of the super-admin space only; a client session in the same browser stays open. */
export const DELETE = route(async () => {
  const jar = await cookies();
  jar.delete(adminCookieName());
  jar.delete(VIEW_COOKIE);
  return { ok: true };
});
