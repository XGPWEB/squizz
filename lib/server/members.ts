import "server-only";
import type { Prisma } from "@prisma/client";
import { fail } from "./http";

/**
 * An organisation always keeps at least one active administrator. Call it inside `withOrgLock`, in the same
 * transaction as the change, so two simultaneous demotions, deactivations or deletions cannot each see the
 * other administrator still in place and together leave none.
 */
export async function assertAnotherAdmin(
  tx: Prisma.TransactionClient,
  organizationId: string,
  exceptId: string,
) {
  const admins = await tx.user.count({
    where: { organizationId, role: "ORG_ADMIN", active: true, id: { not: exceptId } },
  });
  if (!admins) fail("L’organisation doit garder au moins un administrateur actif.", 409);
}

/**
 * The person acting is still an active administrator of the organisation, checked inside the lock: their
 * rights may have been removed by another request since this one was authorised. A super-admin viewing the
 * organisation acts with their own rights.
 */
export async function assertStillAdmin(
  tx: Prisma.TransactionClient,
  user: { id: string; organizationId: string; viewingAs?: boolean },
) {
  if (user.viewingAs) return;
  const actor = await tx.user.findFirst({
    where: { id: user.id, organizationId: user.organizationId, role: "ORG_ADMIN", active: true },
    select: { id: true },
  });
  if (!actor) fail("Réservé aux administrateurs de l’organisation.", 403);
}
