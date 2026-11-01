import { PublicHeader } from "@/components/site/public-header";
import { Footer } from "@/components/site/footer";
import { Motion } from "@/components/site/motion";
import { BackToTop } from "@/components/site/back-to-top";
import { JsonLd } from "@/components/site/json-ld";
import { Analytics } from "@/components/site/analytics";
import { organizationLd, websiteLd } from "@/lib/seo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Motion />
      <Analytics />
      <PublicHeader />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <BackToTop />
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
    </>
  );
}
