import type { MetadataRoute } from "next";

const SITE = process.env.APP_URL || "https://www.squizz.fun";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/admin", "/partie", "/api", "/invitation", "/reinitialiser"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
