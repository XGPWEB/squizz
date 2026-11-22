import type { MetadataRoute } from "next";
import { COMPANY_INFO } from "@/lib/company-info";
import { AUDIENCES } from "@/lib/audiences";
import { GUIDES } from "@/lib/guides";

// Fixed address: these files are generated at build time, where APP_URL may point to localhost.
const SITE = COMPANY_INFO.siteUrl;

/**
 * Each page's last visible change (text, offers, quizzes shown). Update the date with the content:
 * Google ignores `lastModified` once it finds it unreliable, so never bump it without a real change.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (
    path: string,
    lastModified: string,
    priority: number,
    changeFrequency: "weekly" | "monthly" | "yearly",
  ) => ({
    url: `${SITE}${path}`,
    lastModified: new Date(lastModified),
    changeFrequency,
    priority,
  });
  return [
    page("/", "2026-11-15", 1, "weekly"),
    page("/fonctionnalites", "2026-11-07", 0.9, "monthly"),
    page("/tarifs", "2026-11-15", 0.8, "monthly"),
    page("/alternative-kahoot", "2026-11-07", 0.8, "monthly"),
    page("/inscription", "2026-10-02", 0.7, "monthly"),
    page("/demo", "2026-11-15", 0.7, "monthly"),
    ...AUDIENCES.map((a) => page(`/pour/${a.slug}`, "2026-11-19", 0.8, "monthly")),
    page("/guides", "2026-11-19", 0.7, "monthly"),
    ...GUIDES.map((g) => page(`/guides/${g.slug}`, g.published, 0.7, "monthly")),
    page("/demo-visio", "2026-11-19", 0.6, "monthly"),
    page("/jouer", "2026-11-03", 0.6, "monthly"),
    page("/mentions-legales", "2026-09-29", 0.2, "yearly"),
    page("/cgu", "2026-11-22", 0.2, "yearly"),
    page("/confidentialite", "2026-11-03", 0.2, "yearly"),
  ];
}
