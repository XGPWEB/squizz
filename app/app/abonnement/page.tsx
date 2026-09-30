import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PLAN_KEYS } from "@/lib/plans";
import { getSessionUser } from "@/lib/server/guard";
import { billingEnabled } from "@/lib/server/billing";
import { SubscriptionManager } from "./subscription-manager";

export const metadata: Metadata = { title: "Abonnement" };

type Params = { offre?: string; paiement?: string };

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { offre, paiement } = await searchParams;
  const wanted = PLAN_KEYS.find((k) => k === offre) ?? null;
  const user = await getSessionUser();
  // « Choisir Pro » on /tarifs without an account: sign in (or sign up), then come back here.
  if (!user)
    redirect(`/connexion?suite=${encodeURIComponent(`/app/abonnement${wanted ? `?offre=${wanted}` : ""}`)}`);
  if (!user.organization) redirect("/super-admin");
  if (user.role === "HOST") redirect("/app/equipe");
  const org = user.organization;
  return (
    <SubscriptionManager
      org={{
        name: org.name,
        plan: org.plan,
        partner: org.partner,
        subscriptionStatus: org.subscriptionStatus,
        currentPeriodEnd: org.currentPeriodEnd?.toISOString() ?? null,
        cancelRequestedAt: org.cancelRequestedAt?.toISOString() ?? null,
        hasCustomer: Boolean(org.stripeCustomerId),
      }}
      online={billingEnabled()}
      wanted={wanted}
      notice={paiement ?? null}
    />
  );
}
