"use client";
import Script from "next/script";
import { useEffect } from "react";
import { useConsent } from "@/components/site/cookie-consent";
import { trackEvent, type ConversionName } from "@/lib/analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const NOT_COUNTED = "sq_no_audience";

function isNotCounted() {
  try {
    return localStorage.getItem(NOT_COUNTED) === "1";
  } catch {
    return false;
  }
}

/** Removes the Analytics cookies, on the host and on the parent domain gtag.js uses by default. */
function clearGaCookies() {
  const host = location.hostname.replace(/^www\./, "");
  for (const [name] of document.cookie.split("; ").map((c) => c.split("="))) {
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    document.cookie = `${name}=; Path=/; Max-Age=0`;
    document.cookie = `${name}=; Path=/; Max-Age=0; Domain=.${host}`;
  }
}

/**
 * Google Analytics on the public site only: this sits in the (site) layout, so it never loads on a game page,
 * in an organisation's space or in the super-admin. It stays off without NEXT_PUBLIC_GA_MEASUREMENT_ID (read at
 * build time) and without the visitor's consent. Measurement stops as soon as consent is withdrawn or the
 * visitor leaves the public site, because the loaded script otherwise keeps following page changes.
 */
export function Analytics() {
  const { consent, ready } = useConsent();
  const enabled = !!GA_ID && consent?.services.audience === true && !isNotCounted();

  useEffect(() => {
    // Before `ready` the choice is unknown, not refused: acting now would erase a visitor's cookies on each page.
    if (!GA_ID || !ready) return;
    const flag = `ga-disable-${GA_ID}`;
    const globals = window as unknown as Record<string, unknown>;
    globals[flag] = !enabled;
    if (!enabled) clearGaCookies();
    return () => {
      globals[flag] = true;
    };
  }, [enabled, ready]);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest?.("[data-conversion]");
      const name = link?.getAttribute("data-conversion");
      if (name) trackEvent(name as ConversionName);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="squizz-ga" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { cookie_expires: 33696000, allow_google_signals: false, allow_ad_personalization_signals: false });`}
      </Script>
    </>
  );
}

/** Rendered in the super-admin: our own visits to the public site, from this browser, are no longer counted. */
export function NotCountedInAudience() {
  useEffect(() => {
    try {
      localStorage.setItem(NOT_COUNTED, "1");
    } catch {
      // Private browsing: these visits are simply counted, if consent was given.
    }
  }, []);
  return null;
}
