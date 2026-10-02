import type { Plan } from "@prisma/client";

export type PlanLimits = {
  label: string;
  /** Price in euros per billing period (0 for the free plan). No VAT: art. 293 B du CGI. */
  price: number;
  period: "mois" | "an" | null;
  /** Who the plan is for, shown under the price. */
  pitch: string;
  /** Quizzes an organisation can keep; null means unlimited. */
  maxQuizzes: number | null;
  maxPlayersPerGame: number;
  maxMembers: number | null;
  mediaBytes: number;
  /** Stripe product (prod_…) or price (price_…) of a paid plan; not secret. Overridden by STRIPE_PRICE_<PLAN>. */
  stripe: string | null;
  /** Support included: none on the free plan. */
  support: "email" | "priority" | null;
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** Plans are assigned by hand from the super-admin until online payment is wired in. */
export const PLANS: Record<Plan, PlanLimits> = {
  FREE: {
    label: "Gratuit",
    price: 0,
    period: null,
    pitch: "Pour découvrir SQuizz et animer de petits groupes.",
    maxQuizzes: 1,
    maxPlayersPerGame: 5,
    maxMembers: 1,
    mediaBytes: 10 * MB,
    support: null,
    stripe: null,
  },
  STARTER: {
    label: "Essentiel",
    price: 15,
    period: "mois",
    pitch: "Pour les animateurs réguliers et les petites équipes.",
    maxQuizzes: 5,
    maxPlayersPerGame: 15,
    maxMembers: 2,
    mediaBytes: 250 * MB,
    support: "email",
    stripe: "prod_VMCL9yfrMKdVQM",
  },
  PRO: {
    label: "Pro",
    price: 30,
    period: "mois",
    pitch: "Pour les équipes, les écoles et les formations.",
    maxQuizzes: 20,
    maxPlayersPerGame: 50,
    maxMembers: 5,
    mediaBytes: 500 * MB,
    support: "priority",
    stripe: "prod_VMCMxkLAkRlY4k",
  },
  PREMIUM: {
    label: "Premium annuel",
    price: 310,
    period: "an",
    pitch: "Pour les événements et les grandes organisations, toute l’année.",
    maxQuizzes: 50,
    maxPlayersPerGame: 80,
    maxMembers: 10,
    mediaBytes: 1 * GB,
    support: "priority",
    stripe: "prod_VMCPukMyaGNMd6",
  },
};

/** From the smallest to the most complete. */
export const PLAN_KEYS = ["FREE", "STARTER", "PRO", "PREMIUM"] as const satisfies readonly Plan[];

export const planLimits = (plan: Plan) => PLANS[plan];

/**
 * The event pass: one payment, no subscription. For `days` days the organisation gets the limits of `plan`,
 * then goes back to its own plan (its quizzes are kept). Paying again adds `days` more. `stripe` is the
 * Stripe product the payment is filed under (not secret); the amount charged is always `price`.
 */
export const EVENT_PASS = {
  label: "Pack Événement",
  price: 29,
  days: 7,
  plan: "PREMIUM",
  stripe: "prod_VMugZ1ibhjTp4K",
} as const;

/** What decides an organisation's limits. Dates may arrive as text in the browser. */
type OrgPlan = { plan: Plan; partner: boolean; eventPassUntil?: Date | string | null };

export const hasEventPass = (org: OrgPlan, now = Date.now()) =>
  !!org.eventPassUntil && new Date(org.eventPassUntil).getTime() > now;
/** The pass adds nothing to a plan that already gives as much. */
export const passIsUseful = (plan: Plan) => PLAN_KEYS.indexOf(plan) < PLAN_KEYS.indexOf(EVENT_PASS.plan);

/**
 * Partner organisations get Premium for free, whatever plan they are billed for; a running event pass lifts
 * a smaller plan to the pass's plan.
 */
export const effectivePlan = (org: OrgPlan): Plan =>
  org.partner ? "PREMIUM" : hasEventPass(org) && passIsUseful(org.plan) ? EVENT_PASS.plan : org.plan;
/** The limits that actually apply to an organisation: use this for every check. */
export const orgLimits = (org: OrgPlan) => PLANS[effectivePlan(org)];
/** Badge shown in the app bar and the super-admin. */
export const planBadge = (org: OrgPlan) =>
  org.partner
    ? { label: "Partenaire", className: "partner" }
    : effectivePlan(org) !== org.plan
      ? { label: EVENT_PASS.label, className: `plan-${EVENT_PASS.plan.toLowerCase()}` }
      : { label: PLANS[org.plan].label, className: `plan-${org.plan.toLowerCase()}` };
export const isPaid = (plan: Plan) => plan !== "FREE";

/** « 15 € / mois », « 0 € ». */
export const priceLabel = (p: PlanLimits) => `${p.price} €${p.period ? ` / ${p.period}` : ""}`;

export const sizeLabel = (bytes: number) => (bytes >= GB ? `${bytes / GB} Go` : `${bytes / MB} Mo`);

/** « 5 quiz, 15 joueurs par partie, 2 membres, 250 Mo de médias » — used in emails and summaries. */
export const limitsSummary = (p: PlanLimits) =>
  [
    p.maxQuizzes === null ? "quiz illimités" : `${p.maxQuizzes} quiz`,
    `${p.maxPlayersPerGame} joueurs par partie`,
    p.maxMembers === null ? "membres illimités" : `${p.maxMembers} membre${p.maxMembers > 1 ? "s" : ""}`,
    `${sizeLabel(p.mediaBytes)} de médias`,
  ].join(", ");
