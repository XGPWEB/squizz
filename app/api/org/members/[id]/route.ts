import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { assertSeatAvailable } from "@/lib/server/accounts";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";

const schema = z.object({ role: z.enum(["HOST", "ORG_ADMIN"]).optional(), active: z.boolean().optional() });

async function member(orgId: string, id: string) {
  // The platform super-admin is never managed from an organisation's team page.
  const target = await prisma.user.findFirst({
    where: { id, organizationId: orgId, role: { not: "SUPER_ADMIN" } },
  });
  if (!target) fail("Membre introuvable.", 404);
  return target;
}

/** An organisation always keeps at least one active administrator. */
async function assertAnotherAdmin(orgId: string, exceptId: string) {
  const admins = await prisma.user.count({
    where: { organizationId: orgId, role: "ORG_ADMIN", active: true, id: { not: exceptId } },
  });
  if (!admins) fail("L’organisation doit garder au moins un administrateur actif.", 409);
}

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireOrgAdmin();
  const input = await json(req, schema);
  const target = await member(user.organizationId, id);
  const losesAdmin =
    target.role === "ORG_ADMIN" && target.active && (input.role === "HOST" || input.active === false);
  if (losesAdmin) await assertAnotherAdmin(user.organizationId, id);
  if (input.active === true && !target.active) await assertSeatAvailable(user.organizationId);
  await prisma.user.update({
    where: { id },
    data: {
      role: input.role,
      active: input.active,
      // Deactivation or a role change takes effect on the member's open sessions right away.
      sessionVersion: input.active === false ? { increment: 1 } : undefined,
    },
  });
  await audit(user, "member.update", user.organizationId, { memberId: id, email: target.email, ...input });
});

export const DELETE = route<{ id: string }>(async (_, { id }) => {
  const user = await requireOrgAdmin();
  const target = await member(user.organizationId, id);
  if (target.id === user.id) fail("Vous ne pouvez pas supprimer votre propre compte ici.", 409);
  if (target.role === "ORG_ADMIN") await assertAnotherAdmin(user.organizationId, id);
  await prisma.user.delete({ where: { id } });
  await audit(user, "member.delete", user.organizationId, { memberId: id, email: target.email });
});
