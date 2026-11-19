import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Sparkles, Timer, Users, Video } from "lucide-react";
import { JsonLd } from "@/components/site/json-ld";
import { Faq } from "@/components/site/seo-sections";
import { AUDIENCES, audienceOf } from "@/lib/audiences";
import { COMPANY_INFO } from "@/lib/company-info";
import { guidesFor } from "@/lib/guides";
import { estimateLabel } from "@/lib/quiz-duration";
import { demos } from "@/lib/quizzes";

/** Only the pages of lib/audiences.ts; any other address is a 404. */
export const dynamicParams = false;
export const generateStaticParams = () => AUDIENCES.map((a) => ({ usage: a.slug }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ usage: string }>;
}): Promise<Metadata> {
  const a = audienceOf((await params).usage);
  if (!a) return {};
  return {
    alternates: { canonical: `/pour/${a.slug}` },
    title: { absolute: `${a.title} · SQuizz` },
    description: a.description,
    openGraph: { title: a.h1, description: a.description, url: `/pour/${a.slug}` },
  };
}

/** A page by usage: who it is for, the ready-made quizzes that fit, two ways to start. */
export default async function AudiencePage({ params }: { params: Promise<{ usage: string }> }) {
  const a = audienceOf((await params).usage);
  if (!a) notFound();
  const quizzes = a.quizzes.flatMap(([id, note]) =>
    demos.filter((q) => q.id === id).map((quiz) => ({ quiz, note })),
  );
  const others = AUDIENCES.filter((o) => o.slug !== a.slug);
  const guides = guidesFor(a.slug);
  // The short factual answer first (GEO): visible in the FAQ and in its structured data.
  const faq = [{ q: `SQuizz convient-il aux ${a.name.toLowerCase()} ?`, a: a.summary }, ...a.faq];
  const url = `${COMPANY_INFO.siteUrl}/pour/${a.slug}`;
  return (
    <>
      <div className="page-heading usage-heading" data-reveal="up">
        <p className="eyebrow">{a.eyebrow}</p>
        <h1>{a.h1}</h1>
        <p className="lead">{a.lead}</p>
        <div className="row usage-cta">
          <Link className="button" href="/demo" data-conversion="demo_cta_click">
            <Play size={18} aria-hidden /> Essayer une démo
          </Link>
          <Link className="button secondary" href="/inscription" data-conversion="signup_cta_click">
            <Sparkles size={18} aria-hidden /> Créer mon espace gratuit
          </Link>
        </div>
      </div>

      <ul className="usage-points" data-stagger="up">
        {a.points.map((p) => (
          <li key={p.title}>
            <h2>{p.title}</h2>
            <p>{p.text}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="usage-quizzes">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">PRÊTS À LANCER</p>
            <h2 id="usage-quizzes">{a.quizHeading}</h2>
          </div>
          <span className="hint">dans votre espace, gratuit</span>
        </div>
        <div className="quiz-grid" data-stagger="up">
          {quizzes.map(({ quiz: q, note }) => (
            <article className="quiz-card usage-quiz" key={q.id}>
              <div className={`card-art ${q.color}`}>
                <span aria-hidden="true">{q.symbol}</span>
                <span className="pill">{q.usage ? "Modèle" : "SQuizz Originals"}</span>
                <span className="usage-note">{note}</span>
              </div>
              <div className="card-content">
                <p className="eyebrow">{q.tag}</p>
                <h3>{q.title}</h3>
                <p>{q.desc}</p>
                <div className="card-bottom">
                  <span>
                    <Users size={15} aria-hidden /> {q.questions.length} étapes ·{" "}
                    <Timer size={15} aria-hidden /> {estimateLabel(q.questions)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="faq-section" aria-labelledby="usage-faq">
        <div className="section-heading" data-reveal="left">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="usage-faq">Vos questions</h2>
          </div>
        </div>
        <Faq items={faq} />
      </section>

      <section className="cta-band" data-reveal="zoom">
        <div>
          <h2>Prêt pour votre premier quiz&nbsp;?</h2>
          <p>Gratuit, sans carte bancaire. Ces quiz sont déjà dans votre espace.</p>
        </div>
        <div className="cta-points">
          <Link className="button" href="/inscription" data-conversion="signup_cta_click">
            <Sparkles size={18} aria-hidden /> Créer mon espace gratuit
          </Link>
          <Link className="button secondary" href="/demo-visio" data-conversion="demo_visio_click">
            <Video size={18} aria-hidden /> Démo en visio
          </Link>
        </div>
      </section>

      {guides.length > 0 && (
        <nav className="usage-others" aria-label="Guides">
          <span>À lire :</span>
          {guides.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`}>
              {g.name}
            </Link>
          ))}
        </nav>
      )}
      <nav className="usage-others" aria-label="Autres usages">
        <span>Aussi pour :</span>
        {others.map((o) => (
          <Link key={o.slug} href={`/pour/${o.slug}`}>
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
            { "@type": "ListItem", position: 2, name: a.name, item: url },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: a.quizHeading,
          itemListElement: quizzes.map(({ quiz: q, note }, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Quiz",
              name: q.title,
              description: `${note}. ${q.desc}`,
              about: q.tag.charAt(0) + q.tag.slice(1).toLowerCase(),
              inLanguage: "fr",
              audience: { "@type": "Audience", audienceType: a.name },
              provider: { "@type": "Organization", name: "SQuizz", url: COMPANY_INFO.siteUrl },
            },
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />
    </>
  );
}
