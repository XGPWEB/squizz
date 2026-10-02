import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import type { Organization, Plan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { EVENT_PASS, PLAN_KEYS, PLANS, passIsUseful } from "@/lib/plans";
import { CONTACT_EMAIL } from "@/lib/company-info";
import { fail, HttpError } from "./http";
import { appUrl, sendMail } from "./mail";
import { billingAlertEmail, eventPassEmail, organizationUpdateEmail } from "./email-templates";
import { withOrgLock } from "./org-lock";
import { reportAlert } from "./monitoring";

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
  // A call never hangs longer than 20 seconds (one automatic retry): far below the checkout claim.
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
    ...stripeEndpoint(),
    timeout: 20_000,
    maxNetworkRetries: 1,
  });
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

/**
 * The organisation's Stripe customer. If one was created but could not be recorded (database failure,
 * process stopped), it is found again by its organisation id instead of creating a second one; the
 * creation itself carries a stable idempotency key.
 */
async function customerFor(org: Organization, email: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const known = await stripe().customers.list({ email, limit: 100 });
  const customer =
    known.data.find((c) => c.metadata?.organizationId === org.id) ??
    (await stripe().customers.create(
      { email, name: org.name, metadata: { organizationId: org.id }, preferred_locales: ["fr"] },
      { idempotencyKey: `squizz-customer-${org.id}` },
    ));
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

/**
 * How long a checkout claim lasts if its holder never releases it (process stopped). Longer than any normal
 * operation: the Stripe client gives up on a call after 20 seconds.
 */
export const CHECKOUT_CLAIM_MS = 90_000;

/**
 * Takes the organisation's checkout claim: one atomic UPDATE, so it holds across requests and processes.
 * Returns the holder's token, or null when another request holds it (double click, retry, second tab).
 */
async function claimCheckout(orgId: string) {
  const now = new Date();
  const token = randomUUID();
  const { count } = await prisma.organization.updateMany({
    where: { id: orgId, OR: [{ checkoutLockedUntil: null }, { checkoutLockedUntil: { lt: now } }] },
    data: { checkoutLockedUntil: new Date(now.getTime() + CHECKOUT_CLAIM_MS), checkoutLockToken: token },
  });
  return count === 1 ? token : null;
}

/** Waits a few seconds for the claim: a concurrent request (double click, retry, second tab) finishes first. */
async function waitForClaim(orgId: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const token = await claimCheckout(orgId);
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

/** Releases the claim only if this operation still holds it: never the claim of the one that replaced it. */
const releaseCheckout = (orgId: string, token: string) =>
  prisma.organization.updateMany({
    where: { id: orgId, checkoutLockToken: token },
    data: { checkoutLockedUntil: null, checkoutLockToken: null },
  });

type CheckoutState = Pick<
  Prisma.OrganizationUpdateManyMutationInput,
  "checkoutSessionId" | "checkoutPlan" | "checkoutOpKey"
>;

/** Writes the checkout state only while still holding an unexpired claim. False: the claim was lost. */
async function writeAsHolder(orgId: string, token: string, data: CheckoutState) {
  const { count } = await prisma.organization.updateMany({
    where: { id: orgId, checkoutLockToken: token, checkoutLockedUntil: { gt: new Date() } },
    data,
  });
  return count === 1;
}

/** Closes a Checkout page; one that is already expired, paid or gone needs nothing more. */
async function expireSession(id: string) {
  try {
    await stripe().checkout.sessions.expire(id);
  } catch (e) {
    if (isMissing(e) || e instanceof Stripe.errors.StripeInvalidRequestError) return;
    throw e;
  }
}

const LOST_CLAIM =
  "Une autre demande de paiement a pris le relais pour votre organisation. Réessayez dans un instant.";

/**
 * Starts a subscription (Stripe Checkout page) or, when one is already running, switches it to the new plan
 * with a prorated invoice. Returns the page to open.
 *
 * An organisation never ends up with two payable pages, hence never with two subscriptions:
 * - requests are serialised by a persistent claim, written and released only by its holder;
 * - what Stripe really has is read first: a subscription already paid (webhook late or lost) is adopted, and
 *   every Checkout page still open for the customer is either reused (same plan) or expired — including a
 *   page created by an earlier attempt that failed before it could be recorded;
 * - the operation has a durable identity (`checkoutOpKey`) kept until its page is recorded: after a network
 *   failure, a database error or a stopped process, the retry resumes it with the same idempotency key.
 */
export async function subscribe(org: Organization, email: string, plan: Plan) {
  if (org.partner) fail("Votre organisation est partenaire : l’offre Premium vous est déjà offerte.");
  const price = await priceFor(plan);
  if (!price) fail("Choisissez une offre payante.");
  const site = appUrl();

  // Wait a few seconds for a concurrent request to finish, then answer from what it stored.
  const token = await waitForClaim(org.id);
  if (!token)
    fail(
      "Une demande de paiement est déjà en cours pour votre organisation. Réessayez dans un instant.",
      409,
    );
  try {
    let fresh = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    const customer = await customerFor(fresh, email);

    // What Stripe really has for this customer, whatever the webhooks delivered so far.
    const live = await liveSubscriptions(customer);
    if (live.length && fresh.stripeSubscriptionId !== live[0].id) await syncSubscription(live[0]);
    const open = (await stripe().checkout.sessions.list({ customer, status: "open", limit: 100 })).data;
    fresh = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });

    if (fresh.stripeSubscriptionId) {
      const sub = await stripe().subscriptions.retrieve(fresh.stripeSubscriptionId);
      if (sub.status === "incomplete")
        fail(
          "Un paiement est en cours de validation pour votre organisation. Réessayez dans quelques minutes.",
          409,
        );
      if (isLive(sub)) {
        // Already subscribed: no payment page may stay open.
        for (const s of open) await expireSession(s.id);
        await writeAsHolder(org.id, token, {
          checkoutSessionId: null,
          checkoutPlan: null,
          checkoutOpKey: null,
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

    // One page at most: the one for this plan is reused (recorded or not), every other one is closed.
    const reusable = open.find((s) => s.metadata?.plan === plan && s.url) ?? null;
    for (const s of open) if (s.id !== reusable?.id) await expireSession(s.id);
    if (reusable) {
      if (
        !(await writeAsHolder(org.id, token, {
          checkoutSessionId: reusable.id,
          checkoutPlan: plan,
          checkoutOpKey: null,
        }))
      )
        fail(LOST_CLAIM, 409);
      return reusable.url!;
    }

    // Nothing to resume at Stripe: the operation gets (or keeps) its durable identity before anything is created.
    const opKey = fresh.checkoutOpKey ?? randomUUID();
    if (!(await writeAsHolder(org.id, token, { checkoutOpKey: opKey }))) fail(LOST_CLAIM, 409);
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
      // The same operation retried (same key, same plan) gets the same page from Stripe.
      { idempotencyKey: `squizz-checkout-${opKey}-${plan}` },
    );
    if (!session.url) fail("Stripe n’a pas renvoyé de page de paiement.", 502);
    // Recorded only by the holder of the claim.
    if (
      await writeAsHolder(org.id, token, {
        checkoutSessionId: session.id,
        checkoutPlan: plan,
        checkoutOpKey: null,
      })
    )
      return session.url;
    // This operation outlived its claim: the one that replaced it is in charge. Once it is done, either it
    // resumed this very page (same operation key, same plan: Stripe gave it the same one) and the page
    // stands, or it settled on something else and the page created here is closed.
    const after = await waitForClaim(org.id);
    try {
      const now = await prisma.organization.findUnique({ where: { id: org.id } });
      if (after && now?.checkoutSessionId === session.id) return session.url;
      await expireSession(session.id);
    } finally {
      if (after) await releaseCheckout(org.id, after).catch(() => null);
    }
    fail(LOST_CLAIM, 409);
  } finally {
    await releaseCheckout(org.id, token).catch(() => null);
  }
}

const EVENT_PASS_KIND = "event-pass";
const isEventPass = (s: Stripe.Checkout.Session) =>
  s.mode === "payment" && s.metadata?.kind === EVENT_PASS_KIND;

/**
 * Sells the event pass: one payment on a Stripe Checkout page, no subscription. Returns the page to open; a
 * page still open for the pass is reused, so clicking twice never shows two of them. The pass itself is
 * granted when Stripe reports the payment (see applyEventPass).
 */
export async function buyEventPass(org: Organization, email: string) {
  if (org.partner) fail("Votre organisation est partenaire : l’offre Premium vous est déjà offerte.");
  if (!passIsUseful(org.plan))
    fail(`Votre offre ${PLANS[org.plan].label} donne déjà tout ce qu’apporte le ${EVENT_PASS.label}.`);
  const site = appUrl();
  const customer = await customerFor(org, email);
  const open = (await stripe().checkout.sessions.list({ customer, status: "open", limit: 100 })).data;
  const reusable = open.find((s) => isEventPass(s) && s.url);
  if (reusable) return reusable.url!;
  const limits = PLANS[EVENT_PASS.plan];
  const description = `${EVENT_PASS.days} jours, jusqu’à ${limits.maxPlayersPerGame} joueurs par partie, sans abonnement`;
  // A price configured in Stripe (STRIPE_PRICE_EVENT_PASS), else the price of lib/plans.ts sent with the page.
  const configured = process.env.STRIPE_PRICE_EVENT_PASS;
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer,
    client_reference_id: org.id,
    line_items: [
      configured
        ? { price: configured, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: EVENT_PASS.price * 100,
              product_data: { name: `SQuizz — ${EVENT_PASS.label}`, description },
            },
          },
    ],
    metadata: { organizationId: org.id, kind: EVENT_PASS_KIND },
    payment_intent_data: { description: `SQuizz — ${EVENT_PASS.label} (${org.name})` },
    invoice_creation: { enabled: true },
    locale: "fr",
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    success_url: `${site}/app/abonnement?paiement=pack`,
    cancel_url: `${site}/app/abonnement?paiement=annule`,
    custom_text: {
      submit: {
        message: `En payant, vous acceptez les CGU de SQuizz (www.squizz.fun/cgu) et demandez l’activation immédiate du pack pour ${EVENT_PASS.days} jours. Paiement unique, sans abonnement ni renouvellement.`,
      },
    },
  });
  if (!session.url) fail("Stripe n’a pas renvoyé de page de paiement.", 502);
  return session.url;
}

/**
 * Grants a paid event pass: `EVENT_PASS.days` days from now, or added after a pass still running. Safe to
 * call again for the same payment (webhook delivered twice, page reloaded): the session is recorded once.
 */
export async function applyEventPass(session: Stripe.Checkout.Session) {
  if (!isEventPass(session) || session.payment_status !== "paid") return;
  const organizationId = session.metadata?.organizationId ?? session.client_reference_id;
  const granted = organizationId
    ? await withOrgLock(organizationId, async (tx) => {
        const org = await tx.organization.findUnique({ where: { id: organizationId } });
        if (!org) return null;
        if (await tx.eventPass.findUnique({ where: { sessionId: session.id } })) return "known" as const;
        const startsAt = new Date(Math.max(Date.now(), org.eventPassUntil?.getTime() ?? 0));
        const endsAt = new Date(startsAt.getTime() + EVENT_PASS.days * 24 * 60 * 60 * 1000);
        await tx.eventPass.create({
          data: {
            sessionId: session.id,
            organizationId,
            startsAt,
            endsAt,
            amount: session.amount_total ?? EVENT_PASS.price * 100,
          },
        });
        await tx.organization.update({ where: { id: organizationId }, data: { eventPassUntil: endsAt } });
        return { name: org.name, endsAt };
      })
    : null;
  if (granted === "known") return;
  if (!granted) {
    // Paid for an organisation that no longer exists: Pressweb refunds by hand.
    console.error(`Stripe : pack événement ${session.id} payé sans organisation`);
    void reportAlert({
      type: "billing",
      message: `Pack événement ${session.id} payé, organisation introuvable`,
    });
    void sendMail(
      CONTACT_EMAIL,
      billingAlertEmail({
        subscriptionId: session.id,
        reason: "pack événement payé, organisation introuvable",
      }),
    );
    return;
  }
  const admins = await prisma.user.findMany({
    where: { organizationId: organizationId!, role: "ORG_ADMIN", active: true },
  });
  for (const a of admins)
    void sendMail(
      a.email,
      eventPassEmail({ name: a.name, organization: granted.name, until: granted.endsAt }),
    );
}

/**
 * Catches up on event passes paid but not granted yet (webhook late or lost): called when the buyer comes
 * back from the payment page, so the pass is there as soon as the page shows.
 */
export async function reconcileEventPasses(org: Organization) {
  if (!billingEnabled() || !org.stripeCustomerId) return;
  const done = await stripe().checkout.sessions.list({
    customer: org.stripeCustomerId,
    status: "complete",
    limit: 20,
  });
  for (const s of done.data) if (s.metadata?.organizationId === org.id) await applyEventPass(s);
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
      checkoutOpKey: null,
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
  void reportAlert({ type: "billing", message: `Abonnement ${sub.id} annulé automatiquement : ${reason}` });
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
    // A payment by a slower means (bank debit) succeeds after the page is completed.
    case "checkout.session.async_payment_succeeded":
      await applyEventPass(event.data.object);
      break;
    case "checkout.session.completed": {
      const session = event.data.object;
      await applyEventPass(session);
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
