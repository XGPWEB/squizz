import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { route, json } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { assertSeatAvailable } from "@/lib/server/accounts";
import { assertAnotherAdmin, assertStillAdmin } from "@/lib/server/members";
import { withOrgLock } from "@/lib/server/org-lock";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";

const schema = z.object({ role: z.enum(["HOST", "ORG_ADMIN"]).optional(), active: z.boolean().optional() });

/** Read inside the organisation lock: the member as they are now, not as they were when the page loaded. */
async function member(tx: Prisma.TransactionClient, orgId: string, id: string) {
  // The platform super-admin is never managed from an organisation's team page.
  const target = await tx.user.findFirst({
    where: { id, organizationId: orgId, role: { not: "SUPER_ADMIN" } },
  });
  if (!target) fail("Membre introuvable.", 404);
  return target;
}

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const user = await requireOrgAdmin();
  const input = await json(req, schema);
  // Check and change in one locked transaction: see assertAnotherAdmin.
  const target = await withOrgLock(user.organizationId, async (tx) => {
    await assertStillAdmin(tx, user);
    const target = await member(tx, user.organizationId, id);
    const losesAdmin =
      target.role === "ORG_ADMIN" && target.active && (input.role === "HOST" || input.active === false);
    if (losesAdmin) await assertAnotherAdmin(tx, user.organizationId, id);
    if (input.active === true && !target.active) await assertSeatAvailable(user.organizationId, tx);
    await tx.user.update({
      where: { id },
      data: {
        role: input.role,
        active: input.active,
        // Deactivation or a role change takes effect on the member's open sessions right away.
        sessionVersion: input.active === false ? { increment: 1 } : undefined,
      },
    });
    return target;
  });
  await audit(user, "member.update", user.organizationId, { memberId: id, email: target.email, ...input });
});

export const DELETE = route<{ id: string }>(async (_, { id }) => {
  const user = await requireOrgAdmin();
  if (id === user.id) fail("Vous ne pouvez pas supprimer votre propre compte ici.", 409);
  const target = await withOrgLock(user.organizationId, async (tx) => {
    await assertStillAdmin(tx, user);
    const target = await member(tx, user.organizationId, id);
    if (target.role === "ORG_ADMIN") await assertAnotherAdmin(tx, user.organizationId, id);
    await tx.user.delete({ where: { id } });
    return target;
  });
  await audit(user, "member.delete", user.organizationId, { memberId: id, email: target.email });
});
