import { prisma } from "@/lib/prisma";
import { route } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { portalUrl } from "@/lib/server/billing";

/** Stripe's page for invoices and the payment card. */
export const POST = route(async () => {
  const user = await requireOrgAdmin();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  return { url: await portalUrl(org) };
});
