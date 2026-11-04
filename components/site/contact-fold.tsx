"use client";
import { useEffect, useRef } from "react";
import { PenLine } from "lucide-react";

/**
 * The contact form, folded behind « Écrire un message ». It opens by itself when the visitor comes for it:
 * the « Contact » link (#contact) or « Choisir Essentiel » on /tarifs (?offre=).
 */
export function ContactFold({ children }: { children: React.ReactNode }) {
  const fold = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const open = () => {
      if (fold.current) fold.current.open = true;
    };
    if (window.location.hash === "#contact" || /[?&]offre=/.test(window.location.search)) open();
    const onHash = () => window.location.hash === "#contact" && open();
    // A second click on « Contact » leaves the address as it is: no hashchange.
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.('a[href$="#contact"]')) open();
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return (
    <details ref={fold} className="fold contact-fold">
      <summary>
        <PenLine aria-hidden />
        <span className="fold-title">Écrire un message</span>
        <span className="fold-sign" aria-hidden>
          +
        </span>
      </summary>
      <div className="fold-body">{children}</div>
    </details>
  );
}
