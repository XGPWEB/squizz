import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";

const schema = z.object({ role: z.enum(["HOST", "ORG_ADMIN"]).optional(), active: z.boolean().optional() });

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireSuperAdmin();
  const input = await json(req, schema);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === "SUPER_ADMIN") fail("Utilisateur introuvable.", 404);
  await prisma.user.update({
    where: { id },
    data: {
      ...input,
      sessionVersion: input.active === false ? { increment: 1 } : undefined,
      lockedUntil: null,
    },
  });
  await audit(admin, "user.update", target.organizationId, { userId: id, email: target.email, ...input });
});
