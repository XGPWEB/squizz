import {
  BadgeCheck,
  ChartColumn,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  Flag,
  Image,
  LayoutTemplate,
  Library,
  Link2,
  MessageCircleQuestion,
  Palette,
  PieChart,
  RotateCcw,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { slideLayouts } from "@/lib/question";
import { FEATURES, TYPE_DETAILS, TYPE_FAMILIES, type FeatureIcon } from "@/lib/seo";
import { LayoutPreview, TypePreview } from "@/components/squizz/type-preview";

const icons: Record<FeatureIcon, LucideIcon> = {
  ai: Sparkles,
  import: FileSpreadsheet,
  templates: LayoutTemplate,
  media: Image,
  teams: Flag,
  remote: Smartphone,
  qa: MessageCircleQuestion,
  anonymous: EyeOff,
  solo: Link2,
  replay: RotateCcw,
  profiles: PieChart,
  results: ChartColumn,
  export: FileDown,
  theme: Palette,
  brand: BadgeCheck,
  team: Library,
};

/** Anchors of the three families, in the order of lib/question.ts. */
const familyAnchor = { knowledge: "types-connaissances", opinion: "types-avis", slides: "types-diapos" };

/** Quick links at the top of the features section: every family of steps, then every moment. */
export function FeatureNav() {
  return (
    <nav className="feature-nav" aria-label="Fonctionnalités" data-stagger="pop">
      {TYPE_FAMILIES.map((f) => (
        <a key={f.id} href={`#${familyAnchor[f.id]}`} className={`chip-${f.id}`}>
          {f.label} <b>{f.types.length}</b>
        </a>
      ))}
      {FEATURES.map((g) => (
        <a key={g.id} href={`#${g.id}`}>
          {g.label}
        </a>
      ))}
    </nav>
  );
}

/** Every question type and slide step, by family, with its miniature. */
export function TypeShowcase() {
  return (
    <div className="type-families">
      {TYPE_FAMILIES.map((f) => (
        <section key={f.id} id={familyAnchor[f.id]} className={`type-family family-${f.id}`}>
          <div className="type-family-head" data-reveal="left">
            <span className="family-tag">{f.tag}</span>
            <h3>
              {f.label}{" "}
              <small>{f.id === "slides" ? `${f.types.length} étapes` : `${f.types.length} types`}</small>
            </h3>
            <p>{f.hint}</p>
          </div>
          <div className="type-grid showcase" data-stagger="zoom">
            {f.types.map((t) => (
              <article key={t.id}>
                <TypePreview type={t.id} />
                <h4>{t.label}</h4>
                <span>{TYPE_DETAILS[t.id]}</span>
              </article>
            ))}
          </div>
          {f.id === "slides" && (
            <div className="type-grid layout-strip" data-stagger="up">
              {slideLayouts.map((l) => (
                <article key={l.id} title={l.hint}>
                  <LayoutPreview layout={l.id} />
                  <h4>{l.label}</h4>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/** What SQuizz does around the questions, by moment of a game. */
export function FeatureGroups() {
  return (
    <div className="feature-groups">
      {FEATURES.map((g, i) => (
        <section key={g.id} id={g.id} className={`feature-group tone-${i % 4}`}>
          <div className="feature-group-head" data-reveal="left">
            <span className="feature-number" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3>{g.label}</h3>
          </div>
          <div className="feature-cards" data-stagger="up">
            {g.items.map((item) => {
              const Icon = icons[item.icon];
              return (
                <article key={item.title}>
                  <Icon aria-hidden />
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
