"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CreditCard, Ticket } from "lucide-react";
import type { Plan } from "@prisma/client";
import { postJson } from "@/lib/client/api";
import {
  EVENT_PASS,
  PLAN_KEYS,
  PLANS,
  hasEventPass,
  limitsSummary,
  passIsUseful,
  planBadge,
  priceLabel,
} from "@/lib/plans";

type Org = {
  name: string;
  plan: Plan;
  partner: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelRequestedAt: string | null;
  eventPassUntil: string | null;
  hasCustomer: boolean;
};

const date = (d: string) => new Date(d).toLocaleDateString("fr-FR", { dateStyle: "long" });
const dateTime = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

const notices: Record<string, string> = {
  ok: "Paiement reçu, merci ! Votre offre s’active dans quelques secondes (rechargez la page si besoin).",
  pack: `Paiement reçu, merci ! Votre ${EVENT_PASS.label} est activé (rechargez la page s’il n’apparaît pas encore).`,
  change: "Votre offre a été changée. La différence de prix est calculée au prorata.",
  annule: "Paiement annulé : rien n’a été débité.",
};

export function SubscriptionManager({
  org,
  online,
  wanted,
  notice,
}: {
  org: Org;
  online: boolean;
  wanted: Plan | "EVENEMENT" | null;
  notice: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(notice ? (notices[notice] ?? "") : "");
  const current = PLANS[org.plan];
  const paid = org.plan !== "FREE" && !org.partner;
  const badge = planBadge(org);
  const pass = PLANS[EVENT_PASS.plan];
  const passActive = hasEventPass(org);

  async function run(task: () => Promise<void>, done?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      if (done) setMessage(done);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const open = (path: string, body?: object) =>
    run(async () => {
      const { url } = await postJson<{ url: string }>(path, body);
      window.location.assign(url);
    });

  function choose(plan: Plan) {
    const p = PLANS[plan];
    if (!online) {
      router.push(`/?offre=${plan}#contact`);
      return;
    }
    if (org.subscriptionStatus) {
      if (!confirm(`Passer à l’offre ${p.label} (${priceLabel(p)}) ? La différence est facturée au prorata.`))
        return;
    }
    open("/api/billing/checkout", { plan });
  }

  return (
    <>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="success" role="status">
          <Check size={18} /> {message}
        </div>
      )}
      <div className="dash-heading">
        <div>
          <p className="eyebrow">VOTRE ABONNEMENT</p>
          <h1>{org.name}</h1>
          <p className="hint">
            Offre actuelle : <span className={`plan-badge ${badge.className}`}>{badge.label}</span>
          </p>
        </div>
      </div>

      <section className="panel subscription">
        {org.partner ? (
          <>
            <h2>Partenaire SQuizz</h2>
            <p>
              L’offre <strong>{PLANS.PREMIUM.label}</strong> vous est offerte : {limitsSummary(PLANS.PREMIUM)}
              . Rien à payer.
            </p>
          </>
        ) : paid ? (
          <>
            <h2>
              {current.label} · {priceLabel(current)}
            </h2>
            <p className="hint">
              Sans engagement.{" "}
              {org.currentPeriodEnd &&
                (org.cancelRequestedAt
                  ? `Actif jusqu’au ${date(org.currentPeriodEnd)}, puis retour à l’offre Gratuit.`
                  : `Prochain renouvellement le ${date(org.currentPeriodEnd)}.`)}
              {org.subscriptionStatus === "past_due" &&
                " Le dernier paiement a échoué : mettez à jour votre carte pour garder votre offre."}
            </p>
            {org.cancelRequestedAt ? (
              <>
                <p className="info-box">
                  Arrêt demandé le {date(org.cancelRequestedAt)}.{" "}
                  {current.period === "an"
                    ? "L’abonnement ne sera pas renouvelé : il reste actif jusqu’à la fin de l’année déjà payée."
                    : "L’offre reste active jusqu’à la fin du mois en cours, sans nouveau paiement."}{" "}
                  Vos quiz sont conservés.
                </p>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => postJson("/api/org/subscription", { action: "resume" }).then(() => undefined),
                      "Votre abonnement continue.",
                    )
                  }
                >
                  Reprendre mon abonnement
                </button>
              </>
            ) : (
              <button
                className="button secondary danger-button"
                disabled={busy}
                onClick={() => {
                  if (
                    !confirm(
                      `Arrêter l’abonnement ${current.label} ? Il reste actif jusqu’à la fin de la période payée, puis votre espace repasse sur l’offre Gratuit.`,
                    )
                  )
                    return;
                  run(
                    () => postJson("/api/org/subscription", { action: "cancel" }).then(() => undefined),
                    "Arrêt de l’abonnement enregistré. Un e-mail de confirmation vous a été envoyé.",
                  );
                }}
              >
                Arrêter mon abonnement
              </button>
            )}
          </>
        ) : (
          <>
            <h2>Offre Gratuit</h2>
            <p className="hint">
              {limitsSummary(current)}. Choisissez une offre ci-dessous pour aller plus loin, sans engagement.
            </p>
          </>
        )}
        {passActive && org.eventPassUntil && (
          <p className="info-box">
            <strong>{EVENT_PASS.label} actif</strong> jusqu’au {dateTime(org.eventPassUntil)} :{" "}
            {limitsSummary(pass)}. Ensuite, votre espace retrouve son offre habituelle et vos quiz sont
            conservés.
          </p>
        )}
        {online && org.hasCustomer && (
          <button className="button secondary" disabled={busy} onClick={() => open("/api/billing/portal")}>
            <CreditCard size={18} /> Factures et moyen de paiement
          </button>
        )}
      </section>

      {!org.partner && (
        <div className="plan-choice">
          {PLAN_KEYS.filter((k) => k !== "FREE").map((key) => {
            const p = PLANS[key];
            const isCurrent = key === org.plan;
            return (
              <article
                key={key}
                className={`price-card plan-${key.toLowerCase()}${key === wanted && !isCurrent ? " wanted" : ""}`}
              >
                {isCurrent && <span className="sticker pink-sticker">VOTRE OFFRE</span>}
                <h2>{p.label}</h2>
                <p className="price">
                  {p.price} €<small> / {p.period}</small>
                </p>
                <p className="hint">{limitsSummary(p)}</p>
                <button
                  className={`button${key === wanted && !isCurrent ? "" : " secondary"}`}
                  disabled={busy || isCurrent}
                  onClick={() => choose(key)}
                >
                  {isCurrent
                    ? "Offre actuelle"
                    : online
                      ? `Choisir ${p.label.split(" ")[0]}`
                      : "Nous contacter"}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {!org.partner && passIsUseful(org.plan) && (
        <section className={`panel event-pass${wanted === "EVENEMENT" ? " wanted" : ""}`}>
          <div>
            <p className="eyebrow">UN SEUL ÉVÉNEMENT ?</p>
            <h2>
              <Ticket size={22} aria-hidden /> {EVENT_PASS.label} · {EVENT_PASS.price} €
            </h2>
            <p className="hint">
              Paiement unique, sans abonnement : pendant {EVENT_PASS.days} jours, {limitsSummary(pass)}.
              {passActive ? ` Un nouveau pack ajoute ${EVENT_PASS.days} jours au pack en cours.` : ""}
            </p>
          </div>
          <button
            className={`button${wanted === "EVENEMENT" ? "" : " secondary"}`}
            disabled={busy}
            onClick={() =>
              online
                ? open("/api/billing/checkout", { pass: true })
                : router.push("/?offre=EVENEMENT#contact")
            }
          >
            {online
              ? passActive
                ? `Ajouter ${EVENT_PASS.days} jours`
                : "Acheter le pack"
              : "Nous contacter"}
          </button>
        </section>
      )}
      <p className="hint center">
        Paiement sécurisé par Stripe · prix nets, TVA non applicable (art. 293 B du CGI) ·{" "}
        <Link href="/cgu">Conditions générales</Link>
      </p>
    </>
  );
}
