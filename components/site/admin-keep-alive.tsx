"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** At most one renewal per this delay, however busy the super-admin is. */
const EVERY_MS = 5 * 60 * 1000;

/**
 * Renews the super-admin session while it is being used (lib/server/admin-session.ts): on each page, on
 * coming back to the tab, and on clicks or key presses. Nothing is sent while the tab sits idle, so the
 * session still closes after 12 hours without activity.
 */
export function AdminKeepAlive() {
  const pathname = usePathname();
  useEffect(() => {
    let last = 0;
    const renew = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < EVERY_MS) return;
      last = Date.now();
      void fetch("/api/admin/session", { method: "PUT" }).catch(() => null);
    };
    renew();
    window.addEventListener("pointerdown", renew);
    window.addEventListener("keydown", renew);
    document.addEventListener("visibilitychange", renew);
    return () => {
      window.removeEventListener("pointerdown", renew);
      window.removeEventListener("keydown", renew);
      document.removeEventListener("visibilitychange", renew);
    };
  }, [pathname]);
  return null;
}
