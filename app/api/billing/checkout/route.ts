import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLAN_KEYS } from "@/lib/plans";
import { route, json } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { subscribe } from "@/lib/server/billing";

/** Starts or changes the organisation's subscription; returns the page to open (Stripe Checkout or back here). */
export const POST = route(async (req) => {
  const user = await requireOrgAdmin();
  const { plan } = await json(req, z.object({ plan: z.enum(PLAN_KEYS) }));
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  const url = await subscribe(org, user.email, plan);
  await audit(user, "billing.checkout", org.id, { plan });
  return { url };
});
