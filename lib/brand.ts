/**
 * How an organisation's games look to their players: the colourful SQuizz theme, or the sober one with
 * the organisation's logo and colour (corporate events, public services, training).
 */

export type Theme = "squizz" | "sober";
export type Brand = {
  theme: Theme;
  /** The organisation's main colour, always dark enough to carry white text (see `readableAccent`). */
  accent: string;
  /** An image of the organisation's media (`/api/media/<id>`), or null. */
  logo: string | null;
  /** Shows « SQuizz » at the bottom of the screens; only paid plans may hide it. */
  credit: boolean;
};

export const DEFAULT_ACCENT = "#1F4E8C";
export const DEFAULT_BRAND: Brand = { theme: "squizz", accent: DEFAULT_ACCENT, logo: null, credit: true };
/** Ready-made colours offered next to the free choice. */
export const ACCENT_CHOICES = ["#1F4E8C", "#0F766E", "#B42318", "#111418"];

export const isHex = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
/** Contrast ratio between a colour and white (WCAG). */
export const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

/**
 * The colour, darkened just enough to reach 4.5:1 against white: it carries white text on buttons and is
 * read as text on the light background, so a pale yellow chosen by an organisation stays legible.
 */
export function readableAccent(hex: string): string {
  if (!isHex(hex)) return DEFAULT_ACCENT;
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  let out = hex.toUpperCase();
  for (let step = 0; step < 60 && contrastWithWhite(out) < 4.5; step++) {
    [r, g, b] = [r, g, b].map((c) => Math.floor(c * 0.94));
    out = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }
  return out;
}

/** The brand an organisation's settings describe, with safe values whatever is stored. */
export function brandOf(org: {
  theme?: string | null;
  brandAccent?: string | null;
  brandLogo?: string | null;
  brandCredit?: boolean | null;
}): Brand {
  return {
    theme: org.theme === "SOBER" ? "sober" : "squizz",
    accent: readableAccent(org.brandAccent ?? DEFAULT_ACCENT),
    logo: org.brandLogo && /^\/api\/media\/[a-f0-9-]{36}$/.test(org.brandLogo) ? org.brandLogo : null,
    credit: org.brandCredit !== false,
  };
}
