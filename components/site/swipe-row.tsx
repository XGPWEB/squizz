"use client";
import { Children, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Time each card stays in front while the row plays by itself. */
const AUTO_MS = 3500;
/** After a swipe or a tap on the arrows, the row waits this long before playing again. */
const RESUME_MS = 8000;
/** Below this width the CSS turns the cards into a row that slides sideways (site.css). */
const PHONE = "(max-width: 620px)";

const cardsOf = (el: HTMLElement | null) => Array.from(el?.children ?? []) as HTMLElement[];

/** Slides the row to card `i`, back to the first after the last. */
function slide(el: HTMLElement | null, i: number) {
  const list = cardsOf(el);
  const target = list[(i + list.length) % list.length];
  if (el && target) el.scrollTo({ left: target.offsetLeft - list[0].offsetLeft, behavior: "smooth" });
}

/**
 * Cards in a row on a phone: arrows and dots under it say it slides, and it moves on by itself while it is
 * on screen. On a wider screen it is the plain grid, without controls. Every card stays in the page.
 */
export function SwipeRow({
  className,
  label,
  stagger,
  children,
}: {
  className: string;
  /** What the cards are, for screen readers: « Formats de questions ». */
  label: string;
  stagger?: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const count = Children.count(children);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [phone, setPhone] = useState(false);
  const [held, setHeld] = useState(false);
  const release = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (i: number) => slide(track.current, i);
  // The visitor has the row in hand: no autoplay until they leave it alone for a while.
  const hold = () => {
    setHeld(true);
    clearTimeout(release.current);
    release.current = setTimeout(() => setHeld(false), RESUME_MS);
  };
  useEffect(() => () => clearTimeout(release.current), []);

  useEffect(() => {
    const media = matchMedia(PHONE);
    const sync = () => setPhone(media.matches);
    sync();
    media.addEventListener("change", sync);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.6,
    });
    if (track.current) observer.observe(track.current);
    return () => {
      media.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);

  // The card in front follows the scroll, whoever moved it.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const list = cardsOf(el);
      const left = el.scrollLeft + list[0].offsetLeft;
      const nearest = list.reduce(
        (best, c, i) => (Math.abs(c.offsetLeft - left) < Math.abs(list[best].offsetLeft - left) ? i : best),
        0,
      );
      setIndex(nearest);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!phone || !visible || held || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => slide(track.current, index + 1), AUTO_MS);
    return () => clearTimeout(timer);
  }, [phone, visible, held, index]);

  return (
    <div className="swipe-row" role="group" aria-roledescription="carrousel" aria-label={label}>
      <div
        ref={track}
        className={className}
        data-stagger={stagger}
        onPointerDown={hold}
        onWheel={hold}
        onFocus={hold}
      >
        {children}
      </div>
      <div className="swipe-controls">
        <button
          type="button"
          className="swipe-arrow prev"
          aria-label="Carte précédente"
          onClick={() => {
            hold();
            go(index - 1);
          }}
        >
          <ChevronLeft aria-hidden />
        </button>
        <span className="swipe-dots" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <i key={i} className={i === index ? "on" : ""} />
          ))}
        </span>
        <span className="swipe-hint" aria-hidden>
          Glissez
        </span>
        <button
          type="button"
          className="swipe-arrow next"
          aria-label="Carte suivante"
          onClick={() => {
            hold();
            go(index + 1);
          }}
        >
          <ChevronRight aria-hidden />
        </button>
      </div>
    </div>
  );
}
