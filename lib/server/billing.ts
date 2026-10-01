import "server-only";
import Stripe from "stripe";
import type { Organization, Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_KEYS, PLANS } from "@/lib/plans";
import { CONTACT_EMAIL } from "@/lib/company-info";
import { fail, HttpError } from "./http";
import { appUrl, sendMail } from "./mail";
import { billingAlertEmail, organizationUpdateEmail } from "./email-templates";

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

/**
 * Where the Stripe client sends its calls. Tests point it at a local mock (tests/stripe_mock.py) with
 * STRIPE_API_BASE; the override is ignored in production, which always talks to Stripe itself.
 */
export function stripeEndpoint(env: NodeJS.ProcessEnv = process.env) {
  const base = env.NODE_ENV !== "production" ? env.STRIPE_API_BASE : undefined;
  if (!base) return {};
  const url = new URL(base);
  return {
    host: url.hostname,
    port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
    protocol: url.protocol.replace(":", "") as "http" | "https",
  };
}

let client: Stripe | null = null;
export function stripe() {
  if (!billingEnabled()) fail("Le paiement en ligne n’est pas encore disponible.", 503);
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, stripeEndpoint());
  return client;
}

/** Stripe says the object does not exist (any more): for a cancellation, that is already the goal. */
const isMissing = (e: unknown) =>
  e instanceof Stripe.errors.StripeError && (e.code === "resource_missing" || e.statusCode === 404);

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

/** A subscription that is being paid for, or about to be (first payment pending). */
const isLive = (sub: Stripe.Subscription) => !ENDS.has(sub.status);

/** Every subscription of a customer that is not over, oldest first. */
async function liveSubscriptions(customerId: string) {
  const list = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  return list.data.filter(isLive).sort((a, b) => a.created - b.created);
}

const CHECKOUT_CLAIM_MS = 90_000;

/**
 * Takes the organisation's checkout claim: one atomic UPDATE, so it holds across requests and processes.
 * Returns false when another request holds it (double click, retry, second tab).
 */
async function claimCheckout(orgId: string) {
  const now = new Date();
  const { count } = await prisma.organization.updateMany({
    where: { id: orgId, OR: [{ checkoutLockedUntil: null }, { checkoutLockedUntil: { lt: now } }] },
    data: { checkoutLockedUntil: new Date(now.getTime() + CHECKOUT_CLAIM_MS) },
  });
  return count === 1;
}
const releaseCheckout = (orgId: string) =>
  prisma.organization.updateMany({ where: { id: orgId }, data: { checkoutLockedUntil: null } });

/**
 * Starts a subscription (Stripe Checkout page) or, when one is already running, switches it to the new plan
 * with a prorated invoice. Returns the page to open.
 *
 * An organisation never ends up with two paid subscriptions: requests are serialised by a persistent claim;
 * a subscription Stripe already has (webhook late or lost) is adopted instead of selling another; and only
 * one Checkout page is open at a time — the same one is returned for the same plan, the previous one is
 * expired before another plan's page is created.
 */
export async function subscribe(org: Organization, email: string, plan: Plan) {
  if (org.partner) fail("Votre organisation est partenaire : l’offre Premium vous est déjà offerte.");
  const price = await priceFor(plan);
  if (!price) fail("Choisissez une offre payante.");
  const site = appUrl();

  // Wait a few seconds for a concurrent request to finish, then answer from what it stored.
  let claimed = false;
  for (let attempt = 0; attempt < 20 && !(claimed = await claimCheckout(org.id)); attempt++)
    await new Promise((resolve) => setTimeout(resolve, 300));
  if (!claimed)
    fail(
      "Une demande de paiement est déjà en cours pour votre organisation. Réessayez dans un instant.",
      409,
    );
  try {
    let fresh = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });

    // The page opened earlier: still open, paid (webhook not received yet) or expired.
    let open: Stripe.Checkout.Session | null = null;
    if (fresh.checkoutSessionId) {
      const session = await stripe()
        .checkout.sessions.retrieve(fresh.checkoutSessionId)
        .catch((e) => (isMissing(e) ? null : Promise.reject(e)));
      if (session?.status === "open") open = session;
      else {
        if (session?.status === "complete" && session.subscription) {
          const id =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscription(await stripe().subscriptions.retrieve(id));
        }
        await prisma.organization.update({
          where: { id: org.id },
          data: { checkoutSessionId: null, checkoutPlan: null },
        });
      }
    }

    // What Stripe really has for this customer, whatever the webhooks delivered so far.
    if (fresh.stripeCustomerId) {
      const live = await liveSubscriptions(fresh.stripeCustomerId);
      if (live.length && fresh.stripeSubscriptionId !== live[0].id) await syncSubscription(live[0]);
    }
    fresh = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });

    if (fresh.stripeSubscriptionId) {
      const sub = await stripe().subscriptions.retrieve(fresh.stripeSubscriptionId);
      if (sub.status === "incomplete")
        fail(
          "Un paiement est en cours de validation pour votre organisation. Réessayez dans quelques minutes.",
          409,
        );
      if (isLive(sub)) {
        if (open)
          await stripe()
            .checkout.sessions.expire(open.id)
            .catch((e) => (isMissing(e) ? null : Promise.reject(e)));
        await prisma.organization.update({
          where: { id: org.id },
          data: { checkoutSessionId: null, checkoutPlan: null },
        });
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
    }

    if (open) {
      // Same plan: the same page again (double click, new attempt, second tab).
      if (fresh.checkoutPlan === plan && open.url) return open.url;
      // Another plan: the previous page is closed first, so only one can ever be paid.
      await stripe().checkout.sessions.expire(open.id);
    }
    const customer = await customerFor(fresh, email);
    const session = await stripe().checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        client_reference_id: org.id,
        line_items: [{ price, quantity: 1 }],
        metadata: { organizationId: org.id, plan },
        subscription_data: { metadata: { organizationId: org.id } },
        locale: "fr",
        allow_promotion_codes: true,
        // Stripe's minimum: an abandoned page stops being payable after 30 minutes.
        expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${site}/app/abonnement?paiement=ok`,
        cancel_url: `${site}/app/abonnement?paiement=annule`,
        custom_text: {
          submit: {
            message:
              "En vous abonnant, vous acceptez les CGU de SQuizz (www.squizz.fun/cgu) et demandez l’activation immédiate de l’offre. Sans engagement : arrêt à tout moment depuis votre espace.",
          },
        },
      },
      // A network retry of this very call returns the same page.
      { idempotencyKey: `squizz-checkout-${org.id}-${plan}-${fresh.checkoutLockedUntil?.getTime() ?? 0}` },
    );
    if (!session.url) fail("Stripe n’a pas renvoyé de page de paiement.", 502);
    await prisma.organization.update({
      where: { id: org.id },
      data: { checkoutSessionId: session.id, checkoutPlan: plan },
    });
    return session.url;
  } finally {
    await releaseCheckout(org.id);
  }
}

/**
 * Stops everything Stripe could still bill for an organisation about to be deleted: open Checkout pages are
 * expired and every subscription of the customer that is not over is cancelled at once. Throws (and the
 * caller deletes nothing) if Stripe cannot confirm, so a deleted organisation is never left with a running
 * subscription; calling it again after a failure is safe (what is already cancelled is skipped).
 */
export async function stopBillingForDeletion(org: Organization) {
  if (!org.stripeCustomerId && !org.stripeSubscriptionId && !org.checkoutSessionId) return { cancelled: [] };
  const cancelled: string[] = [];
  try {
    const sessions = new Set<string>(org.checkoutSessionId ? [org.checkoutSessionId] : []);
    const subscriptions = new Set<string>(org.stripeSubscriptionId ? [org.stripeSubscriptionId] : []);
    if (org.stripeCustomerId) {
      const open = await stripe().checkout.sessions.list({
        customer: org.stripeCustomerId,
        status: "open",
        limit: 100,
      });
      for (const s of open.data) sessions.add(s.id);
      for (const sub of await liveSubscriptions(org.stripeCustomerId)) subscriptions.add(sub.id);
    }
    for (const id of sessions) {
      const session = await stripe()
        .checkout.sessions.retrieve(id)
        .catch((e) => (isMissing(e) ? null : Promise.reject(e)));
      if (session?.status === "open") await stripe().checkout.sessions.expire(id);
      // Paid in the meantime, webhook not received yet: its subscription must go too.
      if (session?.status === "complete" && session.subscription)
        subscriptions.add(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
        );
    }
    for (const id of subscriptions) {
      const sub = await stripe()
        .subscriptions.retrieve(id)
        .catch((e) => (isMissing(e) ? null : Promise.reject(e)));
      if (!sub || !isLive(sub)) continue;
      await stripe()
        .subscriptions.cancel(id)
        .catch((e) => (isMissing(e) ? null : Promise.reject(e)));
      cancelled.push(id);
    }
  } catch (e) {
    console.error(`Stripe : résiliation impossible avant la suppression de ${org.id}`, e);
    if (e instanceof HttpError && e.status !== 503) throw e;
    fail(
      "L’abonnement Stripe n’a pas pu être résilié : rien n’a été supprimé. Réessayez dans quelques minutes ou écrivez à contact@pressweb.fr.",
      502,
    );
  }
  // If the deletion itself fails afterwards, the organisation is at least coherent: no paid plan.
  await prisma.organization.updateMany({
    where: { id: org.id },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      cancelRequestedAt: null,
      checkoutSessionId: null,
      checkoutPlan: null,
    },
  });
  return { cancelled };
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

/** Cancels a subscription that must not exist (duplicate, or its organisation is gone) and tells Pressweb. */
async function cancelUnwanted(sub: Stripe.Subscription, reason: string) {
  if (isLive(sub))
    await stripe()
      .subscriptions.cancel(sub.id)
      .catch((e) => (isMissing(e) ? null : Promise.reject(e)));
  console.error(`Stripe : abonnement ${sub.id} annulé (${reason})`);
  void sendMail(CONTACT_EMAIL, billingAlertEmail({ subscriptionId: sub.id, reason }));
}

/**
 * Applies a Stripe subscription to its organisation. Idempotent: safe to run for every webhook event and in
 * any order. An organisation keeps one subscription: the first one recorded wins (atomic write), a second
 * live one is cancelled; a subscription whose organisation no longer exists is cancelled too.
 */
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
    // Sold by SQuizz (it carries an organisation id) but the organisation was deleted: stop billing.
    if (sub.metadata?.organizationId && isLive(sub)) await cancelUnwanted(sub, "organisation supprimée");
    else console.error(`Stripe : aucune organisation pour l’abonnement ${sub.id}`);
    return;
  }
  const ended = ENDS.has(sub.status);
  // An old subscription ending must not undo a newer one.
  if (org.stripeSubscriptionId && org.stripeSubscriptionId !== sub.id && ended) return;

  const item = sub.items.data[0];
  const paidPlan = item ? planForPrice(item.price) : null;
  let plan = org.plan;
  if (ended) plan = "FREE";
  else if (KEEPS_PLAN.has(sub.status) && paidPlan) plan = paidPlan;
  const data = {
    plan,
    stripeCustomerId: customerId,
    stripeSubscriptionId: ended ? null : sub.id,
    subscriptionStatus: ended ? null : sub.status,
    currentPeriodEnd: ended || !item ? null : new Date(item.current_period_end * 1000),
    cancelRequestedAt: !ended && sub.cancel_at_period_end ? (org.cancelRequestedAt ?? new Date()) : null,
  };

  // Recorded only if the organisation has no other subscription: one atomic UPDATE, so two webhooks (or two
  // processes) bringing two different subscriptions cannot both win.
  let { count } = await prisma.organization.updateMany({
    where: { id: org.id, OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: sub.id }] },
    data,
  });
  if (!count) {
    const current = await prisma.organization.findUnique({ where: { id: org.id } });
    if (!current) return;
    const recorded = current.stripeSubscriptionId
      ? await stripe()
          .subscriptions.retrieve(current.stripeSubscriptionId)
          .catch((e) => (isMissing(e) ? null : Promise.reject(e)))
      : null;
    if (recorded && isLive(recorded)) {
      await cancelUnwanted(sub, `abonnement en double pour ${org.name} : ${recorded.id} est conservé`);
      return;
    }
    // The recorded one is over: this one takes its place (still atomically).
    ({ count } = await prisma.organization.updateMany({
      where: { id: org.id, stripeSubscriptionId: current.stripeSubscriptionId },
      data,
    }));
    if (!count) return syncSubscription(sub);
  }

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
      await prisma.organization.updateMany({
        where: { checkoutSessionId: session.id },
        data: { checkoutSessionId: null, checkoutPlan: null },
      });
      break;
    }
    case "checkout.session.expired":
      await prisma.organization.updateMany({
        where: { checkoutSessionId: event.data.object.id },
        data: { checkoutSessionId: null, checkoutPlan: null },
      });
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Re-read the subscription: its current state whatever the delivery order, and in this library's API
      // version whatever version the webhook endpoint uses.
      await syncSubscription(await stripe().subscriptions.retrieve(event.data.object.id));
      break;
  }
}
