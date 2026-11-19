import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Video } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { Faq } from "@/components/site/seo-sections";
import { AUDIENCES } from "@/lib/audiences";
import { COMPANY_INFO } from "@/lib/company-info";
import { GUIDES, guideOf, guideQuiz, readingMinutes } from "@/lib/guides";

/** Only the guides of lib/guides.ts; any other address is a 404. */
export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ guide: g.slug }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ guide: string }>;
}): Promise<Metadata> {
  const g = guideOf((await params).guide);
  if (!g) return {};
  return {
    alternates: { canonical: `/guides/${g.slug}` },
    title: { absolute: `${g.title} · SQuizz` },
    description: g.description,
    openGraph: { type: "article", title: g.title, description: g.description, url: `/guides/${g.slug}` },
  };
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** A guide: numbered steps, each with its handwritten moment, the question types and a quiz that does it. */
export default async function GuidePage({ params }: { params: Promise<{ guide: string }> }) {
  const g = guideOf((await params).guide);
  if (!g) notFound();
  const audiences = AUDIENCES.filter((a) => g.audiences.includes(a.slug));
  const others = GUIDES.filter((o) => o.slug !== g.slug);
  const url = `${COMPANY_INFO.siteUrl}/guides/${g.slug}`;
  const [before, sticker, after] = g.h1;
  return (
    <>
      <div className="page-heading howto-heading" data-reveal="up">
        <p className="eyebrow">{g.eyebrow}</p>
        <h1>
          {before} <span>{sticker}</span>
          {after && ` ${after}`}
        </h1>
        <p className="lead">{g.lead}</p>
        <p className="howto-meta">
          {readingMinutes(g)} min de lecture · <time dateTime={g.published}>{dateLabel(g.published)}</time>
        </p>
      </div>

      <ol className="howto-steps" data-stagger="up">
        {g.steps.map((s, i) => {
          const quiz = s.quiz ? guideQuiz(s.quiz) : undefined;
          return (
            <li key={s.title} className="howto-step">
              <span className="howto-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="howto-note">{s.note}</span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
              {(s.types?.length || quiz) && (
                <div className="howto-tags">
                  {s.types?.map((t) => (
                    <span className="howto-type" key={t}>
                      {t}
                    </span>
                  ))}
                  {quiz && (
                    <span className="howto-quiz">
                      <small>{quiz.usage ? "Modèle" : "Original"}</small> {quiz.title}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section className="faq-section" aria-labelledby="guide-faq">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="guide-faq">Vos questions</h2>
          </div>
        </div>
        <Faq items={g.faq} />
      </section>

      <section className="cta-band" data-reveal="zoom">
        <div>
          <h2>Envie de voir ça en vrai&nbsp;?</h2>
          <p>Les quiz cités sont déjà dans votre espace gratuit.</p>
        </div>
        <div className="cta-points">
          <Link className="button" href="/demo" data-conversion="demo_cta_click">
            <Play size={18} aria-hidden /> Essayer une démo
          </Link>
          <Link className="button secondary" href="/demo-visio" data-conversion="demo_visio_click">
            <Video size={18} aria-hidden /> Démo en visio
          </Link>
        </div>
      </section>

      <nav className="usage-others" aria-label="Pages par usage liées">
        <span>Ce guide sert aussi pour :</span>
        {audiences.map((a) => (
          <Link key={a.slug} href={`/pour/${a.slug}`}>
            {a.name}
          </Link>
        ))}
      </nav>
      <nav className="usage-others" aria-label="Autres guides">
        <span>À lire aussi :</span>
        {others.map((o) => (
          <Link key={o.slug} href={`/guides/${o.slug}`}>
            {o.name}
          </Link>
        ))}
      </nav>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: COMPANY_INFO.siteUrl },
            { "@type": "ListItem", position: 2, name: "Guides", item: `${COMPANY_INFO.siteUrl}/guides` },
            { "@type": "ListItem", position: 3, name: g.name, item: url },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: g.title,
          description: g.description,
          inLanguage: "fr",
          step: g.steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.title,
            text: s.text,
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          datePublished: g.published,
          inLanguage: "fr",
          mainEntityOfPage: url,
          author: {
            "@type": "Organization",
            name: COMPANY_INFO.editor.name,
            url: "https://www.pressweb.fr/",
          },
          publisher: { "@type": "Organization", name: "SQuizz", url: COMPANY_INFO.siteUrl },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: g.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </>
  );
}
