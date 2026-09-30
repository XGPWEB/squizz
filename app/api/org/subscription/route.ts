import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CONTACT_EMAIL } from "@/lib/company-info";
import { isPaid } from "@/lib/plans";
import { route, json } from "@/lib/server/api";
import { requireOrgAdmin } from "@/lib/server/guard";
import { fail } from "@/lib/server/http";
import { audit } from "@/lib/server/audit";
import { sendMail } from "@/lib/server/mail";
import { subscriptionCancelEmail, subscriptionCancelNoticeEmail } from "@/lib/server/email-templates";
import { setCancelAtPeriodEnd } from "@/lib/server/billing";

/**
 * An administrator stops (or resumes) the paid plan at any time. With a Stripe subscription, Stripe stops the
 * renewal and the webhook moves the organisation to FREE at the end of the period; without one (plan assigned
 * by hand), Pressweb is told by email and does it from the super-admin.
 */
export const POST = route(async (req) => {
  const user = await requireOrgAdmin();
  const { action } = await json(req, z.object({ action: z.enum(["cancel", "resume"]) }));
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  if (org.partner) fail("Votre organisation est partenaire : il n’y a pas d’abonnement à arrêter.");
  if (!isPaid(org.plan)) fail("Votre espace est sur l’offre Gratuit : il n’y a pas d’abonnement à arrêter.");
  const cancel = action === "cancel";
  if (cancel === Boolean(org.cancelRequestedAt)) return { cancelRequestedAt: org.cancelRequestedAt };
  if (org.stripeSubscriptionId) await setCancelAtPeriodEnd(org, cancel);
  const { cancelRequestedAt } = await prisma.organization.update({
    where: { id: org.id },
    data: { cancelRequestedAt: cancel ? new Date() : null },
  });
  await audit(user, cancel ? "subscription.cancel" : "subscription.resume", org.id, { plan: org.plan });
  void sendMail(
    CONTACT_EMAIL,
    subscriptionCancelNoticeEmail({
      organization: org.name,
      organizationId: org.id,
      plan: org.plan,
      by: `${user.name} (${user.email})`,
      resumed: !cancel,
      automatic: Boolean(org.stripeSubscriptionId),
    }),
    user.email,
  );
  if (cancel)
    void sendMail(
      user.email,
      subscriptionCancelEmail({ name: user.name, organization: org.name, plan: org.plan }),
    );
  return { cancelRequestedAt };
});
