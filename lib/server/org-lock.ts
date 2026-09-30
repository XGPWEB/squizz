import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Runs `fn` in a transaction holding a per-organisation lock, so two simultaneous requests cannot both pass
 * a plan limit check (quizzes, members, media) and exceed it together.
 */
export function withOrgLock<T>(organizationId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${organizationId}))) AS lock`;
    return fn(tx);
  });
}
