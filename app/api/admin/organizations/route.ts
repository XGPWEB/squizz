import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { route, json, emailSchema, nameSchema } from "@/lib/server/api";
import { requireSuperAdmin } from "@/lib/server/guard";
import { createInvitation } from "@/lib/server/accounts";
import { audit } from "@/lib/server/audit";
import { ROOM_TTL } from "@/lib/server/game";

export const GET = route(async () => {
  await requireSuperAdmin();
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, quizzes: true, rooms: true } } },
  });
  const media = await prisma.media.groupBy({ by: ["organizationId"], _sum: { size: true } });
  const mediaByOrg = new Map(media.map((m) => [m.organizationId, m._sum.size ?? 0]));
  const since = BigInt(Date.now() - ROOM_TTL);
  const live = await prisma.room.groupBy({
    by: ["organizationId"],
    where: { created: { gt: since } },
    _count: true,
  });
  const liveByOrg = new Map(live.map((r) => [r.organizationId, r._count]));
  return {
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      plan: o.plan,
      status: o.status,
      createdAt: o.createdAt,
      members: o._count.users,
      quizzes: o._count.quizzes,
      gamesToday: liveByOrg.get(o.id) ?? 0,
      mediaBytes: mediaByOrg.get(o.id) ?? 0,
    })),
  };
});

const createSchema = z.object({ name: nameSchema, adminEmail: emailSchema, plan: z.enum(["FREE", "PRO"]) });

/** Creates an organisation and invites its first administrator. */
export const POST = route(async (req) => {
  const admin = await requireSuperAdmin();
  const input = await json(req, createSchema);
  const org = await prisma.organization.create({ data: { name: input.name, plan: input.plan } });
  const { link, sent } = await createInvitation(
    org.id,
    input.adminEmail,
    "ORG_ADMIN",
    admin.id,
    "L’équipe SQuizz",
  );
  await audit(admin, "organization.create", org.id, input);
  return { id: org.id, link, sent };
});
