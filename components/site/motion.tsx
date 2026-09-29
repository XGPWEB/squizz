"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Lightweight scroll effects for the public site, driven by data attributes:
 *  - data-reveal[="up|left|right|zoom|pop"]  fades the element in when it enters the viewport
 *  - data-stagger                             reveals its children one after another
 *  - data-parallax="0.3"                      moves the element at a different speed while scrolling
 * Content stays visible without JavaScript (the hidden state needs html.motion), and everything
 * is disabled for visitors who ask for reduced motion.
 */
export function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.classList.remove("motion");
      return;
    }
    root.classList.add("motion");

    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        const el = child as HTMLElement;
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", group.dataset.stagger || "up");
        el.style.setProperty("--reveal-delay", `${i * 90}ms`);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll("[data-reveal]:not(.is-visible)").forEach((el) => observer.observe(el));

    const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    const progress = document.querySelector<HTMLElement>(".scroll-progress");
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      for (const el of layers) {
        const speed = Number(el.dataset.parallax) || 0;
        const rect = el.parentElement?.getBoundingClientRect();
        // Offset relative to the element's section so layers far down the page start aligned.
        const offset = rect ? rect.top + rect.height / 2 - vh / 2 : 0;
        el.style.setProperty("--parallax", `${(-offset * speed).toFixed(1)}px`);
      }
      if (progress) {
        const max = document.documentElement.scrollHeight - vh;
        progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div className="scroll-progress" aria-hidden="true" />;
}
