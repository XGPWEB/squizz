import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PLAN_KEYS, offerOf, passIsUseful } from "@/lib/plans";
import { getSessionUser } from "@/lib/server/guard";
import { prisma } from "@/lib/prisma";
import { billingEnabled, reconcileEventPasses } from "@/lib/server/billing";
import { SubscriptionManager } from "./subscription-manager";

export const metadata: Metadata = { title: "Abonnement" };

type Params = { offre?: string; paiement?: string };

const PASS = "EVENEMENT";

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { offre, paiement } = await searchParams;
  const asked = offre === PASS ? PASS : (PLAN_KEYS.find((k) => k === offre) ?? null);
  const user = await getSessionUser();
  // Not signed in: sign in (or sign up), then come back here.
  if (!user)
    redirect(`/connexion?suite=${encodeURIComponent(`/app/abonnement${asked ? `?offre=${asked}` : ""}`)}`);
  if (!user.organization) redirect("/super-admin");
  if (user.role === "HOST") redirect("/app/equipe");
  let org = user.organization;
  // The offer chosen before signing up: the page opens on it and, when it can be bought as is (online
  // payment, nothing subscribed yet), goes straight to its payment page — the checkout request then forgets
  // the choice, so this happens once (coming back from Stripe is an ordinary visit). When it cannot be
  // bought as is, the choice is shown this once and forgotten here.
  const online = billingEnabled();
  const chosen = user.viewingAs ? null : offerOf(org.wantedOffer);
  const wanted = asked ?? chosen;
  const buyable =
    chosen === PASS
      ? passIsUseful(org.plan)
      : org.plan === "FREE" && !org.subscriptionStatus && !org.stripeSubscriptionId;
  const payNow = Boolean(chosen) && chosen === wanted && online && !org.partner && buyable;
  if (chosen && !payNow)
    await prisma.organization.update({ where: { id: org.id }, data: { wantedOffer: null } });
  // Back from paying the event pass: it is granted now, without waiting for Stripe's own notification.
  if (paiement === "pack") {
    await reconcileEventPasses(org).catch((e) => console.error("Pack événement : rattrapage impossible", e));
    org = (await prisma.organization.findUnique({ where: { id: org.id } })) ?? org;
  }
  return (
    <SubscriptionManager
      org={{
        name: org.name,
        plan: org.plan,
        partner: org.partner,
        subscriptionStatus: org.subscriptionStatus,
        currentPeriodEnd: org.currentPeriodEnd?.toISOString() ?? null,
        cancelRequestedAt: org.cancelRequestedAt?.toISOString() ?? null,
        eventPassUntil: org.eventPassUntil?.toISOString() ?? null,
        hasCustomer: Boolean(org.stripeCustomerId),
      }}
      online={online}
      wanted={wanted}
      payNow={payNow}
      notice={paiement ?? null}
    />
  );
}
