import { rm } from "node:fs/promises";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, nameSchema } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { fail } from "@/lib/server/http";
import { mediaPath } from "@/lib/server/media-store";
import { sendMail } from "@/lib/server/mail";
import { organizationUpdateEmail, partnerEmail } from "@/lib/server/email-templates";
import { PLAN_KEYS } from "@/lib/plans";
import { stopBillingForDeletion } from "@/lib/server/billing";

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
  // The organisation's AI key never leaves the server, even encrypted.
  const { aiKey, ...shown } = org;
  void aiKey;
  return { ...shown, mediaBytes: media._sum.size ?? 0, mediaCount: media._count };
});

const schema = z.object({
  name: nameSchema.optional(),
  plan: z.enum(PLAN_KEYS).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  partner: z.boolean().optional(),
});

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireSuperAdmin();
  const input = await json(req, schema);
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) fail("Organisation introuvable.", 404);
  // A new plan settles any pending cancellation (usually: the move to FREE at the end of the paid period).
  const settles = input.plan && input.plan !== org.plan ? { cancelRequestedAt: null } : {};
  const partnerChange = input.partner !== undefined && input.partner !== org.partner;
  const since = partnerChange ? { partnerSince: input.partner ? new Date() : null } : {};
  await prisma.organization.update({ where: { id }, data: { ...input, ...settles, ...since } });
  // Suspension signs every member out immediately.
  if (input.status === "SUSPENDED")
    await prisma.user.updateMany({
      where: { organizationId: id },
      data: { sessionVersion: { increment: 1 } },
    });
  await audit(admin, "organization.update", id, input);
  // The organisation's administrators hear about a new plan, a suspension or a reactivation.
  // A partnership that starts or ends has its own email (it names the plan that applies next).
  const plan = !partnerChange && input.plan && input.plan !== org.plan ? input.plan : undefined;
  const status = input.status && input.status !== org.status ? input.status : undefined;
  if (partnerChange) {
    const admins = await prisma.user.findMany({
      where: { organizationId: id, role: "ORG_ADMIN", active: true },
    });
    for (const a of admins)
      void sendMail(
        a.email,
        partnerEmail({
          name: a.name,
          organization: input.name ?? org.name,
          partner: input.partner!,
          plan: input.plan ?? org.plan,
        }),
      );
  }
  if (plan || status) {
    const admins = await prisma.user.findMany({
      where: { organizationId: id, role: "ORG_ADMIN", active: true },
    });
    for (const a of admins)
      void sendMail(
        a.email,
        organizationUpdateEmail({
          name: a.name,
          organization: input.name ?? org.name,
          plan,
          status,
        }),
      );
  }
});

/** Irreversible: requires the organisation's exact name as confirmation. */
export const DELETE = route<{ id: string }>(async (req, { id }) => {
  const admin = await requireSuperAdmin();
  const { confirm } = await json(req, z.object({ confirm: z.string() }));
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) fail("Organisation introuvable.", 404);
  if (confirm.trim() !== org.name) fail("Saisissez le nom exact de l’organisation pour confirmer.");
  // Stripe first: if the subscription cannot be cancelled, nothing is deleted and the deletion can be retried.
  const { cancelled } = await stopBillingForDeletion(org);
  const media = await prisma.media.findMany({ where: { organizationId: id }, select: { id: true } });
  await audit(admin, "organization.delete", null, { id, name: org.name, cancelled });
  await prisma.organization.delete({ where: { id } });
  // Rows go by cascade; the files on disk must go too (the privacy policy promises it).
  await Promise.all(media.map((m) => rm(mediaPath(m.id), { force: true })));
});
