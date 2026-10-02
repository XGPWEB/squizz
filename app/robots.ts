import type { MetadataRoute } from "next";
import { COMPANY_INFO } from "@/lib/company-info";

// Fixed address: these files are generated at build time, where APP_URL may point to localhost.
const SITE = COMPANY_INFO.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // « ?suite= » : the sign-in and sign-up pages reached from an offer button, the same page each time.
      disallow: ["/app", "/partie", "/api", "/invitation", "/reinitialiser", "/*?suite="],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
