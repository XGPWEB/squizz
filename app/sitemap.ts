import type { MetadataRoute } from "next";

const SITE = process.env.APP_URL || "https://www.squizz.fun";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" | "yearly") => ({
    url: `${SITE}${path}`,
    lastModified: new Date("2026-09-30"),
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/tarifs", 0.8, "monthly"),
    page("/inscription", 0.7, "monthly"),
    page("/jouer", 0.6, "monthly"),
    page("/connexion", 0.3, "yearly"),
    page("/mentions-legales", 0.2, "yearly"),
    page("/cgu", 0.2, "yearly"),
    page("/confidentialite", 0.2, "yearly"),
  ];
}
