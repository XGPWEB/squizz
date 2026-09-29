import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";
import { createViewToken, VIEW_COOKIE, viewCookieOptions } from "@/lib/server/view-as";

/** Starts viewing an organisation as its administrator (2 hours, separate from the session). */
export const POST = route<{ id: string }>(async (_, { id }) => {
  const admin = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) fail("Organisation introuvable.", 404);
  (await cookies()).set(VIEW_COOKIE, createViewToken(admin.id, org.id), viewCookieOptions());
  await audit(admin, "organization.view_as", org.id, { name: org.name });
  return { ok: true };
});
