"use client";
import Link from "next/link";

/**
 * Menu link to a section of the home page. Next.js does nothing when the address already ends with
 * that anchor, so a second click (after scrolling back up) has to move to the section itself.
 */
export function AnchorLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const hash = href.slice(1);
        const target = document.getElementById(hash.slice(1));
        if (window.location.hash === hash && target) {
          event.preventDefault();
          target.scrollIntoView();
        }
      }}
    >
      {children}
    </Link>
  );
}
