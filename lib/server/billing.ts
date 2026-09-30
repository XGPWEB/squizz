import "server-only";
import Stripe from "stripe";
import type { Organization, Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_KEYS, PLANS } from "@/lib/plans";
import { fail } from "./http";
import { appUrl, sendMail } from "./mail";
import { organizationUpdateEmail } from "./email-templates";

/**
 * Stripe billing. Online payment is on only when the secret key and the webhook secret are set (in
 * /opt/squizz-secrets.env on the server) and every paid plan has a Stripe product or price (lib/plans.ts, or
 * STRIPE_PRICE_<PLAN>); otherwise plans are sold through the contact form and assigned by hand, as before.
 */
const PAID = PLAN_KEYS.filter((p) => p !== "FREE");
/** prod_… or price_… configured for a plan. */
const stripeRef = (plan: Plan) => process.env[`STRIPE_PRICE_${plan}`] || PLANS[plan].stripe || undefined;

export const billingEnabled = () =>
  Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && PAID.every((p) => stripeRef(p)),
  );

let client: Stripe | null = null;
export function stripe() {
  if (!billingEnabled()) fail("Le paiement en ligne n’est pas encore disponible.", 503);
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

/** The price to charge: the configured price, or the default price of the configured product. */
async function priceFor(plan: Plan) {
  const ref = plan === "FREE" ? undefined : stripeRef(plan);
  if (!ref) return undefined;
  if (!ref.startsWith("prod_")) return ref;
  const product = await stripe().products.retrieve(ref);
  const price = typeof product.default_price === "string" ? product.default_price : product.default_price?.id;
  if (!price) fail(`Le produit Stripe de l’offre ${PLANS[plan].label} n’a pas de prix par défaut.`, 500);
  return price;
}

/** Which plan a subscription line belongs to, by its price or its product. */
const planForPrice = (price: Stripe.Price): Plan | null => {
  const product = typeof price.product === "string" ? price.product : price.product.id;
  return PAID.find((p) => [price.id, product].includes(stripeRef(p)!)) ?? null;
};

/** Statuses in which the customer keeps the plan they pay for (Stripe retries failed payments meanwhile). */
const KEEPS_PLAN = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);
/** Statuses that end the subscription: back to the free plan. */
const ENDS = new Set<Stripe.Subscription.Status>(["canceled", "unpaid", "incomplete_expired"]);

async function customerFor(org: Organization, email: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({
    email,
    name: org.name,
    metadata: { organizationId: org.id },
    preferred_locales: ["fr"],
  });
  await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/**
 * Starts a subscription (Stripe Checkout page) or, when one is already running, switches it to the new plan
 * with a prorated invoice. Returns the page to open.
 */
export async function subscribe(org: Organization, email: string, plan: Plan) {
  if (org.partner) fail("Votre organisation est partenaire : l’offre Premium vous est déjà offerte.");
  const price = await priceFor(plan);
  if (!price) fail("Choisissez une offre payante.");
  const site = appUrl();
  if (org.stripeSubscriptionId && org.subscriptionStatus && !ENDS.has(org.subscriptionStatus as never)) {
    const sub = await stripe().subscriptions.retrieve(org.stripeSubscriptionId);
    const item = sub.items.data[0];
    if (item.price.id === price) fail("C’est déjà votre offre actuelle.");
    const updated = await stripe().subscriptions.update(sub.id, {
      items: [{ id: item.id, price }],
      proration_behavior: "always_invoice",
      cancel_at_period_end: false,
    });
    await syncSubscription(updated);
    return `${site}/app/abonnement?paiement=change`;
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(org, email),
    client_reference_id: org.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { organizationId: org.id } },
    locale: "fr",
    allow_promotion_codes: true,
    success_url: `${site}/app/abonnement?paiement=ok`,
    cancel_url: `${site}/app/abonnement?paiement=annule`,
    custom_text: {
      submit: {
        message:
          "En vous abonnant, vous acceptez les CGU de SQuizz (www.squizz.fun/cgu) et demandez l’activation immédiate de l’offre. Sans engagement : arrêt à tout moment depuis votre espace.",
      },
    },
  });
  if (!session.url) fail("Stripe n’a pas renvoyé de page de paiement.", 502);
  return session.url;
}

/** Stops renewal at the end of the paid period, or resumes it. */
export async function setCancelAtPeriodEnd(org: Organization, cancel: boolean) {
  const sub = await stripe().subscriptions.update(org.stripeSubscriptionId!, {
    cancel_at_period_end: cancel,
  });
  await syncSubscription(sub);
}

/** Stripe's own page for invoices and the payment card. */
export async function portalUrl(org: Organization) {
  if (!org.stripeCustomerId) fail("Aucun paiement enregistré pour cette organisation.");
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl()}/app/abonnement`,
    locale: "fr",
  });
  return session.url;
}

/** Applies a Stripe subscription to its organisation. Idempotent: safe to run for every webhook event. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: sub.id },
        { stripeCustomerId: customerId },
        ...(sub.metadata?.organizationId ? [{ id: sub.metadata.organizationId }] : []),
      ],
    },
  });
  if (!org) {
    console.error(`Stripe : aucune organisation pour l’abonnement ${sub.id}`);
    return;
  }
  // An old subscription ending must not undo a newer one.
  if (org.stripeSubscriptionId && org.stripeSubscriptionId !== sub.id && ENDS.has(sub.status)) return;

  const item = sub.items.data[0];
  const paidPlan = item ? planForPrice(item.price) : null;
  let plan = org.plan;
  if (ENDS.has(sub.status)) plan = "FREE";
  else if (KEEPS_PLAN.has(sub.status) && paidPlan) plan = paidPlan;
  const ended = ENDS.has(sub.status);

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: ended ? null : sub.id,
      subscriptionStatus: ended ? null : sub.status,
      currentPeriodEnd: ended || !item ? null : new Date(item.current_period_end * 1000),
      cancelRequestedAt: !ended && sub.cancel_at_period_end ? (org.cancelRequestedAt ?? new Date()) : null,
    },
  });

  if (plan !== org.plan) {
    const admins = await prisma.user.findMany({
      where: { organizationId: org.id, role: "ORG_ADMIN", active: true },
    });
    for (const a of admins)
      void sendMail(a.email, organizationUpdateEmail({ name: a.name, organization: org.name, plan }));
  }
}

/** Verifies and handles one webhook call. */
export async function handleWebhook(payload: string, signature: string | null) {
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    fail("Signature Stripe invalide.", 400);
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe().subscriptions.retrieve(id));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Re-read the subscription: its current state whatever the delivery order, and in this library's API
      // version whatever version the webhook endpoint uses.
      await syncSubscription(await stripe().subscriptions.retrieve(event.data.object.id));
      break;
  }
}
