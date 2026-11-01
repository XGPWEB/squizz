import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/site/json-ld";
import { Advantages, Faq } from "@/components/site/seo-sections";
import { PLANS } from "@/lib/plans";
import { PAID_PLANS_TEXT } from "@/lib/seo";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  alternates: { canonical: "/alternative-kahoot" },
  title: "Alternative française à Kahoot! — comparatif",
  description:
    "SQuizz, l’alternative française à Kahoot!, Mentimeter et Wooclap : quiz en direct sur téléphone, essai gratuit, offres sans engagement, données hébergées en Europe, sans publicité.",
};

const free = PLANS.FREE;
const CHECKED = "30 septembre 2026";

/** Competitor facts come from their public pricing and help pages, dated below. Update them together. */
const rows: { label: string; squizz: string; kahoot: string; menti: string; wooclap: string }[] = [
  {
    label: "Éditeur",
    squizz: "Pressweb, France",
    kahoot: "Kahoot!, Norvège",
    menti: "Mentimeter, Suède",
    wooclap: "Wooclap, Belgique",
  },
  {
    label: "Principe",
    squizz: "Quiz projeté, réponses sur téléphone, classement en direct",
    kahoot: "Quiz projeté, réponses sur téléphone, classement en direct",
    menti: "Présentation interactive : sondages, nuages de mots, quiz",
    wooclap: "Questions interactives en cours ou en réunion",
  },
  {
    label: "Offre gratuite",
    squizz: `${free.maxPlayersPerGame} joueurs par partie, parties illimitées, ${free.maxQuizzes} quiz, sans carte bancaire`,
    kahoot: "Version gratuite pour découvrir, avec un nombre de participants très limité",
    menti: "50 participants par mois, tous événements confondus",
    wooclap: "Beaucoup de participants, mais un nombre de questions par événement limité",
  },
  {
    label: "Offres payantes",
    squizz: `${PAID_PLANS_TEXT}, sans engagement ; jusqu’à ${PLANS.PREMIUM.maxPlayersPerGame} joueurs par partie`,
    kahoot: "Offres entreprise à partir de 19 $ par mois (50 participants), facturées à l’année",
    menti: "Abonnements par présentateur, facturés à l’année",
    wooclap: "À partir de 9,99 € par utilisateur et par mois (entreprise), facturés à l’année",
  },
  {
    label: "Côté joueurs",
    squizz: "Code ou QR code, pseudo, sans compte ni application",
    kahoot: "Code PIN, sans compte",
    menti: "Code, sans compte",
    wooclap: "Code ou lien, sans compte",
  },
  {
    label: "Travail en équipe",
    squizz: "Organisation, administrateurs et animateurs, bibliothèque partagée",
    kahoot: "Selon l’offre",
    menti: "Selon l’offre",
    wooclap: "Selon l’offre",
  },
];

const sources = [
  ["Kahoot! 360 — tarifs", "https://kahoot360.com/pricing/"],
  ["Kahoot! — participants par partie", "https://support.kahoot.com/hc/en-us/articles/115003072287"],
  [
    "Mentimeter — offre gratuite",
    "https://help.mentimeter.com/en/articles/1258367-what-is-included-in-the-free-account",
  ],
  ["Wooclap — tarifs entreprise", "https://www.wooclap.com/en/pricing/pricing-business/"],
];

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: COMPANY_INFO.siteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Alternative à Kahoot!",
      item: `${COMPANY_INFO.siteUrl}/alternative-kahoot`,
    },
  ],
};

export default function AlternativePage() {
  return (
    <>
      <div className="page-heading" data-reveal="up">
        <p className="eyebrow">COMPARATIF</p>
        <h1>L’alternative française à Kahoot!</h1>
        <p className="lead">
          Même plaisir du quiz en direct, avec une interface en français, des données hébergées en Europe et
          des offres sans engagement.
        </p>
      </div>

      <section className="compare-section" aria-labelledby="table-title">
        <h2 id="table-title">SQuizz, Kahoot!, Mentimeter et Wooclap</h2>
        <div className="compare-wrap" data-reveal="up">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Critère</span>
                </th>
                <th scope="col" className="us">
                  SQuizz
                </th>
                <th scope="col">Kahoot!</th>
                <th scope="col">Mentimeter</th>
                <th scope="col">Wooclap</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td className="us">{r.squizz}</td>
                  <td>{r.kahoot}</td>
                  <td>{r.menti}</td>
                  <td>{r.wooclap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="compare-note">
          Informations relevées le {CHECKED} sur les pages publiques des éditeurs, susceptibles d’évoluer :{" "}
          {sources.map(([label, url], i) => (
            <span key={url}>
              {i > 0 && ", "}
              <a href={url} rel="nofollow noopener" target="_blank">
                {label}
              </a>
            </span>
          ))}
          . Kahoot!, Mentimeter et Wooclap sont des marques de leurs propriétaires respectifs ; SQuizz n’y est
          pas affilié.
        </p>
      </section>

      <section className="compare-section" aria-labelledby="why-title">
        <h2 id="why-title">Ce que SQuizz fait différemment</h2>
        <Advantages />
      </section>

      <section className="compare-section" aria-labelledby="choose-title">
        <h2 id="choose-title">Quel outil choisir ?</h2>
        <div className="compare-honest" data-stagger="up">
          <article>
            <h3>Choisissez SQuizz si…</h3>
            <ul>
              <li>vous animez en français et voulez un outil simple à prendre en main ;</li>
              <li>vos données doivent rester en Europe (RGPD) ;</li>
              <li>vos parties comptent jusqu’à {PLANS.PREMIUM.maxPlayersPerGame} joueurs ;</li>
              <li>plusieurs animateurs partagent les mêmes quiz ;</li>
              <li>vous voulez essayer gratuitement, puis vous abonner sans engagement.</li>
            </ul>
          </article>
          <article>
            <h3>Un autre outil sera plus adapté si…</h3>
            <ul>
              <li>
                vos événements réunissent plusieurs centaines ou milliers de participants en même temps ;
              </li>
              <li>vous voulez piocher dans une immense bibliothèque de quiz publics (Kahoot!) ;</li>
              <li>
                vous animez surtout depuis PowerPoint ou une plateforme d’enseignement (Wooclap, Mentimeter).
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="compare-section" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions fréquentes</h2>
        <Faq />
      </section>

      <section className="cta-band" data-reveal="zoom">
        <div>
          <h2>Essayez avec votre prochain groupe.</h2>
          <p>
            Créez votre espace en une minute, sans carte bancaire, et lancez une première partie jusqu’à{" "}
            {free.maxPlayersPerGame} joueurs.
          </p>
        </div>
        <div className="cta-points">
          <Link className="button" href="/inscription" data-conversion="signup_cta_click">
            Créer mon espace gratuit
          </Link>
          <Link className="button secondary" href="/tarifs">
            Voir les tarifs
          </Link>
        </div>
      </section>
      <JsonLd data={breadcrumbLd} />
    </>
  );
}
