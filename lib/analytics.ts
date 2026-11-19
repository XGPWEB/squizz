/** The conversions counted on the public site, with their label on the super-admin dashboard. */
export const CONVERSIONS = {
  signup_cta_click: "Clic « créer mon espace »",
  demo_cta_click: "Clic « essayer une démo »",
  pricing_cta_click: "Clic sur une offre",
  signup_complete: "Inscription envoyée",
  contact_form_submit: "Message de contact envoyé",
  demo_visio_click: "Clic « démo en visio »",
  demo_request_submit: "Démo en visio demandée",
} as const;
export type ConversionName = keyof typeof CONVERSIONS;

/** Sends a conversion to Google Analytics. Does nothing when it is not loaded (no consent, or not set up). */
export function trackEvent(name: ConversionName) {
  if (typeof window === "undefined") return;
  (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", name);
}
