import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";
import { assertAnotherAdmin } from "@/lib/server/members";
import { withOrgLock } from "@/lib/server/org-lock";

const schema = z.object({ role: z.enum(["HOST", "ORG_ADMIN"]).optional(), active: z.boolean().optional() });

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireSuperAdmin();
  const input = await json(req, schema);
  const found = await prisma.user.findUnique({ where: { id } });
  if (!found || found.role === "SUPER_ADMIN") fail("Utilisateur introuvable.", 404);
  const data = {
    ...input,
    sessionVersion: input.active === false ? { increment: 1 } : undefined,
    lockedUntil: null,
  };
  // The organisation keeps an active administrator here too: same locked check as the team page.
  const target = found.organizationId
    ? await withOrgLock(found.organizationId, async (tx) => {
        const target = await tx.user.findUnique({ where: { id } });
        if (!target || target.role === "SUPER_ADMIN") fail("Utilisateur introuvable.", 404);
        const losesAdmin =
          target.role === "ORG_ADMIN" && target.active && (input.role === "HOST" || input.active === false);
        if (losesAdmin && target.organizationId) await assertAnotherAdmin(tx, target.organizationId, id);
        await tx.user.update({ where: { id }, data });
        return target;
      })
    : await prisma.user.update({ where: { id }, data }).then(() => found);
  await audit(admin, "user.update", target.organizationId, { userId: id, email: target.email, ...input });
});
