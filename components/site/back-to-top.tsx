"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating sticker of the public site: pops in once the visitor has scrolled past the first screen,
 * fills with pink as the page is read, and launches its arrow when clicked.
 */
export function BackToTop() {
  const button = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [launched, setLaunched] = useState(false);
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      button.current?.style.setProperty("--read", `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`);
      setVisible(y > window.innerHeight * 0.8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLaunched(true);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      ref={button}
      type="button"
      className="back-to-top"
      data-visible={visible}
      data-launched={launched}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="Remonter en haut de la page"
      onClick={toTop}
      onTransitionEnd={(event) => {
        // Re-arm the launch once the sticker has faded out at the top of the page.
        if (!visible && event.propertyName === "visibility") setLaunched(false);
      }}
    >
      <span className="back-to-top-note" aria-hidden>
        HOP, EN HAUT&nbsp;!
      </span>
      <span className="back-to-top-disc">
        <ArrowUp size={26} strokeWidth={3.2} aria-hidden />
      </span>
    </button>
  );
}
