import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { FAMILY_ANCHOR, MomentCatalog, TypeCatalog } from "@/components/site/features";
import { COMPANY_INFO } from "@/lib/company-info";
import { FEATURES, QUESTION_COUNT, TYPE_FAMILIES } from "@/lib/seo";

const DESCRIPTION = `${QUESTION_COUNT} types de questions, diapos et roue de tirage : découvrez tout ce que SQuizz propose pour animer vos quiz. Essayez gratuitement.`;

export const metadata: Metadata = {
  alternates: { canonical: "/fonctionnalites" },
  title: `Fonctionnalités : ${QUESTION_COUNT} types de questions, diapos et roue`,
  description: DESCRIPTION,
  openGraph: { title: "Fonctionnalités de SQuizz", description: DESCRIPTION, url: "/fonctionnalites" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: COMPANY_INFO.siteUrl },
    {
      "@type": "ListItem",
      position: 2,
      name: "Fonctionnalités",
      item: `${COMPANY_INFO.siteUrl}/fonctionnalites`,
    },
  ],
};

const jumps = [
  ...TYPE_FAMILIES.map((f) => ({
    href: `#${FAMILY_ANCHOR[f.id]}`,
    label: f.label,
    count: f.types.length,
  })),
  {
    href: "#autour-des-questions",
    label: "Autour des questions",
    count: FEATURES.reduce((n, g) => n + g.items.length, 0),
  },
];

export default function FeaturesPage() {
  return (
    <>
      <div className="page-heading catalog-intro" data-reveal="up">
        <p className="eyebrow">FONCTIONNALITÉS</p>
        <h1>
          Tout ce que SQuizz <span>sait faire</span>
        </h1>
        <p className="lead">
          {QUESTION_COUNT} types de questions pour tester les connaissances ou recueillir des avis, des diapos
          et une roue de tirage, puis tout ce qui sert avant, pendant et après la partie.
        </p>
        <nav className="catalog-jumps" aria-label="Aller à">
          {jumps.map((j, i) => (
            <a key={j.href} href={j.href} className={`tone-${i % 4}`}>
              {j.label} <b>{j.count}</b>
            </a>
          ))}
        </nav>
      </div>
      <TypeCatalog />
      <div id="autour-des-questions" className="catalog-moments">
        <MomentCatalog />
      </div>
      <section className="cta-band" data-reveal="zoom">
        <div>
          <h2>Essayez avec votre premier quiz.</h2>
          <p>L’offre gratuite suffit pour découvrir chaque format, sans carte bancaire.</p>
        </div>
        <div className="cta-points">
          <Link className="button" href="/inscription" data-conversion="signup_cta_click">
            <Sparkles size={18} /> Créer mon espace gratuit
          </Link>
          <Link className="hint" href="/tarifs">
            Comparer les offres →
          </Link>
        </div>
      </section>
      <JsonLd data={breadcrumbLd} />
    </>
  );
}
