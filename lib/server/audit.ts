import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "./guard";

export async function audit(
  actor: Pick<SessionUser, "id" | "email">,
  action: string,
  organizationId: string | null,
  details?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { actorId: actor.id, actorEmail: actor.email, organizationId, action, details },
  });
}
