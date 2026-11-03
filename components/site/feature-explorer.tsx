"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
  Pause,
  PieChart,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { slideLayouts, type QuestionType } from "@/lib/question";
import type { FeatureIcon } from "@/lib/seo";
import { LayoutPreview, TypePreview } from "@/components/squizz/type-preview";

export type ExplorerFamily = {
  id: string;
  label: string;
  tag: string;
  hint: string;
  types: { id: QuestionType; label: string; detail: string }[];
};
export type ExplorerMoment = {
  id: string;
  label: string;
  items: { icon: FeatureIcon; title: string; text: string }[];
};

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

/** Family names on phones, where the three tabs share one line. */
const SHORT: Record<string, string> = { knowledge: "Connaissances", opinion: "Avis", slides: "Diapos" };

/** Time each type stays on stage while the tour plays by itself. */
const TOUR_MS = 4500;

/** Arrow keys, Home and End move between the tabs of a tablist (WAI-ARIA tabs pattern). */
function tabKeys(e: KeyboardEvent, index: number, count: number, select: (i: number) => void) {
  const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  const target =
    e.key === "Home" ? 0 : e.key === "End" ? count - 1 : next ? (index + next + count) % count : null;
  if (target === null) return;
  e.preventDefault();
  select(target);
  const tabs = e.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[role=tab]");
  tabs?.[target]?.focus();
}

/**
 * Every question type on one stage: the families as tabs, the types of the open family as chips, and the
 * chosen type shown large with its description. It tours the types by itself while it is on screen, until
 * the visitor picks one or presses pause (and never with reduced motion).
 */
export function TypeExplorer({ families }: { families: ExplorerFamily[] }) {
  const [fam, setFam] = useState(0);
  const [sel, setSel] = useState(0);
  const [touring, setTouring] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.35,
    });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  const running = touring && visible && !hovered;
  useEffect(() => {
    // No tour with reduced motion: the pause button and the progress bars are hidden by the CSS too.
    if (!running || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => {
      if (sel + 1 < families[fam].types.length) setSel(sel + 1);
      else {
        setFam((fam + 1) % families.length);
        setSel(0);
      }
    }, TOUR_MS);
    return () => clearTimeout(timer);
  }, [running, fam, sel, families]);

  const family = families[fam];
  const openFamily = (i: number) => {
    setFam(i);
    setSel(0);
    setTouring(false);
  };

  return (
    <div
      ref={root}
      className={`type-explorer family-${family.id}${running ? "" : " is-paused"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="family-tabs" role="tablist" aria-label="Familles de questions">
        {families.map((f, i) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            id={`famille-${f.id}`}
            aria-selected={i === fam}
            aria-controls="types-stage"
            tabIndex={i === fam ? 0 : -1}
            className={`family-tab tab-${f.id}`}
            onClick={() => openFamily(i)}
            onKeyDown={(e) => tabKeys(e, i, families.length, openFamily)}
          >
            <span className="tab-long">{f.label}</span>
            <span className="tab-short">{SHORT[f.id] ?? f.label}</span>
            <b>{f.types.length}</b>
          </button>
        ))}
      </div>

      <div
        className="explorer-body"
        id="types-stage"
        role="tabpanel"
        aria-labelledby={`famille-${family.id}`}
      >
        <div className="explorer-side">
          <p className="explorer-hint">
            <span className="family-tag">{family.tag}</span>
            {family.hint}
          </p>
          <div className="type-chips">
            {family.types.map((t, i) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={i === sel}
                className="type-chip"
                onClick={() => {
                  setSel(i);
                  setTouring(false);
                }}
              >
                {t.label}
                {i === sel && touring && <i key={`${fam}-${sel}`} className="chip-progress" aria-hidden />}
              </button>
            ))}
          </div>
        </div>

        <div className="explorer-stage">
          <button
            type="button"
            className="tour-toggle"
            onClick={() => setTouring(!touring)}
            aria-label={touring ? "Arrêter le défilement" : "Faire défiler les types"}
          >
            {touring ? <Pause size={16} /> : <Play size={16} />}
          </button>
          {/* Every type is in the page (for search engines); only the chosen one is shown. */}
          {families.map((f, fi) =>
            f.types.map((t, ti) => (
              <article key={t.id} className="stage-panel" hidden={fi !== fam || ti !== sel}>
                <div className={`type-grid stage-preview${t.id === "slide" ? " is-slides" : ""}`}>
                  {t.id === "slide" ? (
                    slideLayouts.map((l) => (
                      <figure key={l.id}>
                        <LayoutPreview layout={l.id} />
                        <figcaption>{l.label}</figcaption>
                      </figure>
                    ))
                  ) : (
                    <TypePreview type={t.id} />
                  )}
                </div>
                <div className="stage-copy">
                  <span className="stage-count">
                    {ti + 1} / {f.types.length}
                  </span>
                  <h4>{t.label}</h4>
                  <p>{t.detail}</p>
                </div>
              </article>
            )),
          )}
        </div>
      </div>
    </div>
  );
}

/** Everything around the questions, one moment of a game at a time. */
export function MomentTabs({ moments }: { moments: ExplorerMoment[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="moment-tabs">
      <div
        className="moment-list"
        role="tablist"
        aria-label="Moments d’une partie"
        aria-orientation="vertical"
      >
        {moments.map((m, i) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`moment-${m.id}`}
            aria-selected={i === active}
            aria-controls={`panneau-${m.id}`}
            tabIndex={i === active ? 0 : -1}
            className={`moment-tab tone-${i % 4}`}
            onClick={() => setActive(i)}
            onKeyDown={(e) => tabKeys(e, i, moments.length, setActive)}
          >
            <span className="moment-num" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="moment-label">{m.label}</span>
            <small>{m.items.length} fonctions</small>
          </button>
        ))}
      </div>
      {moments.map((m, i) => (
        <div
          key={m.id}
          id={`panneau-${m.id}`}
          role="tabpanel"
          aria-labelledby={`moment-${m.id}`}
          hidden={i !== active}
          className={`moment-panel tone-${i % 4}`}
        >
          <ul>
            {m.items.map((item, j) => {
              const Icon = icons[item.icon];
              return (
                <li key={item.title} style={{ ["--i" as string]: j }}>
                  <Icon aria-hidden />
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
