import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { orgLimits } from "@/lib/plans";
import { route, json, nameSchema } from "@/lib/server/api";
import { requireMember, requireOrgAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";

/** Organisation overview: members, pending invitations and usage against the plan. */
export const GET = route(async () => {
  const user = await requireMember();
  const orgId = user.organizationId;
  const [members, invitations, quizzes, media] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    user.role === "HOST"
      ? []
      : prisma.invitation.findMany({
          where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
          select: { id: true, email: true, role: true, expiresAt: true },
          orderBy: { createdAt: "desc" },
        }),
    prisma.quiz.count({ where: { organizationId: orgId } }),
    prisma.media.aggregate({ where: { organizationId: orgId }, _sum: { size: true } }),
  ]);
  return {
    organization: {
      id: orgId,
      name: user.organization.name,
      plan: user.organization.plan,
      partner: user.organization.partner,
      limits: orgLimits(user.organization),
      cancelRequestedAt: user.organization.cancelRequestedAt,
    },
    me: { id: user.id, role: user.role },
    members,
    invitations,
    usage: { quizzes, members: members.filter((m) => m.active).length, mediaBytes: media._sum.size ?? 0 },
  };
});

export const PATCH = route(async (req) => {
  const user = await requireOrgAdmin();
  const { name } = await json(req, z.object({ name: nameSchema }));
  await prisma.organization.update({ where: { id: user.organizationId }, data: { name } });
  await audit(user, "organization.rename", user.organizationId, { name });
});
