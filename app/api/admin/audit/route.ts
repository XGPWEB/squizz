import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";

export const GET = route(async () => {
  await requireSuperAdmin();
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { organization: { select: { name: true } } },
  });
  return { entries };
});
