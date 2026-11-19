import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { GUIDES, readingMinutes } from "@/lib/guides";
import { COMPANY_INFO } from "@/lib/company-info";

export const metadata: Metadata = {
  alternates: { canonical: "/guides" },
  title: "Guides : animer un séminaire, une formation, une soirée quiz",
  description:
    "Guides pratiques pour animer avec un quiz interactif : séminaire d’entreprise, choix du format de question, soirée quiz entre amis ou en association.",
  openGraph: { title: "Les guides SQuizz", url: "/guides" },
};

/** The guides, as cards in the style of the quiz cards. */
export default function GuidesPage() {
  return (
    <>
      <div className="page-heading" data-reveal="up">
        <p className="eyebrow">GUIDES</p>
        <h1>
          Animer, <span>mode</span> d’emploi
        </h1>
        <p className="lead">
          Des idées concrètes, prêtes à jouer : à chaque étape, la question et le quiz qui vont avec.
        </p>
      </div>

      <div className="quiz-grid howto-grid" data-stagger="up">
        {GUIDES.map((g) => (
          <Link className="quiz-card howto-card" href={`/guides/${g.slug}`} key={g.slug}>
            <div className={`card-art ${g.color}`}>
              <span aria-hidden="true">{g.symbol}</span>
              <span className="pill">GUIDE</span>
              <span className="usage-note">{readingMinutes(g)} min de lecture</span>
            </div>
            <div className="card-content">
              <p className="eyebrow">{g.eyebrow.replace("GUIDE · ", "")}</p>
              <h2>{g.title}</h2>
              <p>{g.lead}</p>
              <span className="howto-more">
                Lire le guide <ArrowRight size={16} aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Guides SQuizz",
          itemListElement: GUIDES.map((g, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${COMPANY_INFO.siteUrl}/guides/${g.slug}`,
            name: g.title,
          })),
        }}
      />
    </>
  );
}
