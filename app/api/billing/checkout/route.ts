import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLAN_KEYS } from "@/lib/plans";
import { route, json } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { audit } from "@/lib/server/audit";
import { buyEventPass, subscribe } from "@/lib/server/billing";

/**
 * Starts or changes the organisation's subscription, or sells the event pass (`pass: true`); returns the page
 * to open (Stripe Checkout or back here).
 */
export const POST = route(async (req) => {
  const user = await requireOrgAdmin();
  const input = await json(
    req,
    z.union([z.object({ plan: z.enum(PLAN_KEYS) }), z.object({ pass: z.literal(true) })]),
  );
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  // A payment is being started: the offer kept from the pricing page has done its job (see the subscription
  // page). Forgotten whatever happens next, so a failure never sends the buyer back here in a loop.
  if (org.wantedOffer)
    await prisma.organization.update({ where: { id: org.id }, data: { wantedOffer: null } });
  if ("pass" in input) {
    const url = await buyEventPass(org, user.email);
    await audit(user, "billing.event-pass", org.id);
    return { url };
  }
  const url = await subscribe(org, user.email, input.plan);
  await audit(user, "billing.checkout", org.id, { plan: input.plan });
  return { url };
});
