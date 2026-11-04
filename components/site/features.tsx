import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { questionTypes, slideLayouts } from "@/lib/question";
import { FEATURES, TYPE_DETAILS, TYPE_FAMILIES, typeAnchor } from "@/lib/seo";
import { LayoutPreview, TypePreview } from "@/components/squizz/type-preview";
import { FEATURE_ICONS } from "./feature-icons";
import { Fold } from "./fold";

/** The six types the home page shows; the others are named in one line, all are on /fonctionnalites. */
const FEATURED = ["quiz", "truefalse", "blindtest", "puzzle", "wordcloud", "pin"] as const;
const FEATURE_COUNT = FEATURES.reduce((n, g) => n + g.items.length, 0);
/** The anchor of each family on /fonctionnalites. */
export const FAMILY_ANCHOR: Record<string, string> = {
  knowledge: "connaissances",
  opinion: "avis",
  slides: "diapos",
};

/** Home page: six types drawn, the others named, and a link to every detail. */
export function FormatsPreview() {
  const others = questionTypes
    .filter((t) => !(FEATURED as readonly string[]).includes(t.id))
    .map((t) => t.label[0].toLowerCase() + t.label.slice(1))
    .join(", ");
  return (
    <>
      <div className="type-grid showcase" data-stagger="zoom">
        {FEATURED.map((id) => {
          const t = questionTypes.find((x) => x.id === id)!;
          return (
            <Link key={id} href={`/fonctionnalites#${typeAnchor(t.label)}`} className="showcase-card">
              <TypePreview type={id} />
              <h3>{t.label}</h3>
              <span>{t.hint}</span>
            </Link>
          );
        })}
      </div>
      <p className="feature-more">Et aussi : {others}.</p>
      <Link className="more-link" href="/fonctionnalites">
        Tous les formats en détail <ArrowRight size={18} aria-hidden />
      </Link>
    </>
  );
}

/** Home page: the features around the questions, folded, by moment, titles only. */
export function MomentsFold() {
  return (
    <Fold className="moments-fold" title="Et autour des questions…" count={`${FEATURE_COUNT} fonctions`}>
      <div className="moment-grid">
        {FEATURES.map((g, i) => (
          <div key={g.id} className={`moment-card tone-${i % 4}`} style={{ ["--i" as string]: i }}>
            <h3>{g.label}</h3>
            <ul>
              {g.items.map((item) => {
                const Icon = FEATURE_ICONS[item.icon];
                return (
                  <li key={item.title}>
                    <Icon aria-hidden /> {item.title}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <Link className="more-link" href="/fonctionnalites#autour-des-questions">
        Chaque fonction expliquée <ArrowRight size={18} aria-hidden />
      </Link>
    </Fold>
  );
}

/** /fonctionnalites: every type, by family, each with its own anchor. */
export function TypeCatalog() {
  return TYPE_FAMILIES.map((f) => (
    <section key={f.id} id={FAMILY_ANCHOR[f.id]} className="catalog-section">
      <div className="section-heading" data-reveal="left">
        <div>
          <p className="eyebrow">{f.tag.toUpperCase()}</p>
          <h2>{f.label}</h2>
          <p className="catalog-hint">{f.hint}</p>
        </div>
        <span className="hint">
          {f.types.length} {f.id === "slides" ? "étapes" : "types"}
        </span>
      </div>
      <div className="type-grid showcase catalog" data-stagger="up">
        {f.types.map((t) => (
          <article key={t.id} id={typeAnchor(t.label)}>
            {t.id === "slide" ? (
              <span className="catalog-layouts">
                {slideLayouts.slice(0, 2).map((l) => (
                  <LayoutPreview key={l.id} layout={l.id} />
                ))}
              </span>
            ) : (
              <TypePreview type={t.id} />
            )}
            <h3>{t.label}</h3>
            <p>{TYPE_DETAILS[t.id]}</p>
          </article>
        ))}
      </div>
    </section>
  ));
}

/** /fonctionnalites: everything around the questions, one moment of a game per block. */
export function MomentCatalog() {
  return FEATURES.map((g, i) => (
    <section key={g.id} id={g.id} className={`catalog-section moment-block tone-${i % 4}`}>
      <div className="section-heading" data-reveal="left">
        <div>
          <p className="eyebrow">{String(i + 1).padStart(2, "0")} · AUTOUR DES QUESTIONS</p>
          <h2>{g.label}</h2>
        </div>
      </div>
      <ul className="feature-cards" data-stagger="up">
        {g.items.map((item) => {
          const Icon = FEATURE_ICONS[item.icon];
          return (
            <li key={item.title}>
              <Icon aria-hidden />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          );
        })}
      </ul>
    </section>
  ));
}
