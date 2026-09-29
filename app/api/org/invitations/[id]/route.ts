import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";

export const DELETE = route<{ id: string }>(async (_, { id }) => {
  const user = await requireOrgAdmin();
  const { count } = await prisma.invitation.deleteMany({
    where: { id, organizationId: user.organizationId },
  });
  if (!count) fail("Invitation introuvable.", 404);
});
