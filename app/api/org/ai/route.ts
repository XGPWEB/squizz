import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { json, route } from "@/lib/server/api";
import { aiSettings, removeAiSettings, saveAiSettings } from "@/lib/server/ai";
import { audit } from "@/lib/server/audit";
import { requireMember, requireOrgAdmin } from "@/lib/server/guard";

/** Whether the organisation has an AI account connected (never the key), for every member. */
export const GET = route(async () => {
  const user = await requireMember();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  return { ...aiSettings(org), canEdit: user.role !== "HOST" };
});

export const PUT = route(async (req) => {
  const user = await requireOrgAdmin();
  const body = await json(req, z.record(z.string(), z.unknown()));
  await saveAiSettings(user.organizationId, body);
  await audit(user, "organization.ai", user.organizationId, { provider: String(body.provider) });
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  return { ...aiSettings(org), canEdit: true };
});

export const DELETE = route(async () => {
  const user = await requireOrgAdmin();
  await removeAiSettings(user.organizationId);
  await audit(user, "organization.ai_removed", user.organizationId, {});
  return { ok: true };
});
