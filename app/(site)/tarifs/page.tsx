import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Faq } from "@/components/site/seo-sections";
import { PLAN_KEYS, PLANS, sizeLabel, type PlanLimits } from "@/lib/plans";

export const metadata: Metadata = {
  alternates: { canonical: "/tarifs" },
  title: "Tarifs",
  description:
    "SQuizz gratuit, Essentiel à 15 € / mois, Pro à 30 € / mois ou Premium à 310 € / an : sans engagement, résiliable à tout moment.",
};

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function features(p: PlanLimits) {
  return [
    p.maxQuizzes === null
      ? "Quiz illimités"
      : `${p.maxQuizzes} quiz enregistré${p.maxQuizzes > 1 ? "s" : ""}`,
    `Jusqu’à ${p.maxPlayersPerGame} joueurs par partie`,
    p.maxMembers === null
      ? "Animateurs illimités"
      : p.maxMembers === 1
        ? "1 animateur"
        : `${p.maxMembers} animateurs dans l’équipe`,
    `${sizeLabel(p.mediaBytes)} de médias`,
    "Tous les types de questions et de diapos",
    ...(p.support ? [p.support === "priority" ? "Support prioritaire" : "Support par e-mail"] : []),
  ];
}

const PRICING_FAQ = [
  {
    q: "Suis-je engagé ?",
    a: "Non. Toutes les offres sont sans engagement : vous arrêtez votre abonnement à tout moment, en un clic depuis la page « Abonnement » de votre espace, ou par e-mail à contact@pressweb.fr.",
  },
  {
    q: "Que se passe-t-il si j’arrête mon abonnement ?",
    a: "Pour Essentiel et Pro, l’arrêt prend effet à la fin du mois en cours, sans nouveau paiement. Pour Premium, l’abonnement n’est pas renouvelé et reste actif jusqu’à la fin de l’année déjà payée. Votre espace repasse ensuite sur l’offre Gratuit : vos quiz sont conservés.",
  },
  {
    q: "Comment souscrire ?",
    a: "Choisissez votre offre, connectez-vous (ou créez votre espace) et payez par carte bancaire, en toute sécurité avec Stripe : l’offre est activée immédiatement. Factures et carte se gèrent depuis la page « Abonnement » de votre espace.",
  },
  {
    q: "Puis-je changer d’offre ?",
    a: "Oui, à tout moment, vers une offre plus complète ou plus simple, depuis la page « Abonnement ». La différence de prix est calculée au prorata.",
  },
  {
    q: "Les prix incluent-ils la TVA ?",
    a: "Les prix sont nets : TVA non applicable, article 293 B du Code général des impôts.",
  },
];

export default function PricingPage() {
  return (
    <>
      <div className="page-heading" data-reveal="up">
        <p className="eyebrow">TARIFS</p>
        <h1>Simple comme un quiz.</h1>
        <p className="lead">
          Démarrez gratuitement, puis choisissez l’offre qui suit le rythme de vos parties.
        </p>
        <ul className="price-promises">
          <li>Sans engagement</li>
          <li>Résiliable à tout moment</li>
          <li>Sans publicité</li>
        </ul>
      </div>
      <div className="price-grid" data-stagger="pop">
        {PLAN_KEYS.map((key) => {
          const p = PLANS[key];
          const featured = key === "PREMIUM";
          return (
            <article
              key={key}
              className={`price-card plan-${key.toLowerCase()}${featured ? " featured" : ""}`}
            >
              {featured && <span className="sticker pink-sticker">LE PLUS COMPLET</span>}
              <h2>{p.label}</h2>
              <p className="price">
                {p.price} €{p.period && <small> / {p.period}</small>}
              </p>
              <p className="price-note">
                {p.period === "an"
                  ? `Soit ${euros(p.price / 12)} € par mois, payé une fois par an`
                  : p.period
                    ? "Sans engagement, arrêt à tout moment"
                    : "Sans carte bancaire"}
              </p>
              <p className="hint">{p.pitch}</p>
              <ul>
                {features(p).map((f) => (
                  <li key={f}>
                    <Check size={18} /> {f}
                  </li>
                ))}
              </ul>
              {p.price === 0 ? (
                <Link className="button secondary" href="/inscription">
                  Créer mon espace
                </Link>
              ) : (
                <Link
                  className={`button${featured ? "" : " secondary"}`}
                  href={`/connexion?suite=${encodeURIComponent(`/app/abonnement?offre=${key}`)}`}
                >
                  Choisir {p.label.split(" ")[0]}
                </Link>
              )}
            </article>
          );
        })}
      </div>
      <section className="price-faq">
        <h2>Abonnement : vos questions</h2>
        <Faq items={PRICING_FAQ} />
      </section>
    </>
  );
}
