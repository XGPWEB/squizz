import type { MetadataRoute } from "next";
import { COMPANY_INFO } from "@/lib/company-info";

// Fixed address: these files are generated at build time, where APP_URL may point to localhost.
const SITE = COMPANY_INFO.siteUrl;

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
