import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, nameSchema } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";

export const GET = route<{ id: string }>(async (_, { id }) => {
  await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
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
      },
      invitations: {
        where: { acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, expiresAt: true },
      },
      quizzes: {
        select: { id: true, title: true, updatedAt: true, createdBy: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!org) fail("Organisation introuvable.", 404);
  const media = await prisma.media.aggregate({
    where: { organizationId: id },
    _sum: { size: true },
    _count: true,
  });
  return { ...org, mediaBytes: media._sum.size ?? 0, mediaCount: media._count };
});

const schema = z.object({
  name: nameSchema.optional(),
  plan: z.enum(["FREE", "PRO"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireSuperAdmin();
  const input = await json(req, schema);
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) fail("Organisation introuvable.", 404);
  await prisma.organization.update({ where: { id }, data: input });
  // Suspension signs every member out immediately.
  if (input.status === "SUSPENDED")
    await prisma.user.updateMany({
      where: { organizationId: id },
      data: { sessionVersion: { increment: 1 } },
    });
  await audit(admin, "organization.update", id, input);
});

/** Irreversible: requires the organisation's exact name as confirmation. */
export const DELETE = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireSuperAdmin();
  const { confirm } = await json(req, z.object({ confirm: z.string() }));
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) fail("Organisation introuvable.", 404);
  if (confirm.trim() !== org.name) fail("Saisissez le nom exact de l’organisation pour confirmer.");
  await audit(admin, "organization.delete", null, { id, name: org.name });
  await prisma.organization.delete({ where: { id } });
});
