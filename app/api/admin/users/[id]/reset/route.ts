import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { createResetLink } from "@/lib/server/accounts";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";

/** Gives support a one-hour reset link to pass on to a user who is locked out. */
export const POST = route<{ id: string }>(async (_, { id }) => {
  const admin = await requireSuperAdmin();
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) fail("Utilisateur introuvable.", 404);
  const link = await createResetLink(id);
  await audit(admin, "user.reset_link", target.organizationId, { userId: id, email: target.email });
  return { link };
});
