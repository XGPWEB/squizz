import { PublicHeader } from "@/components/site/public-header";
import { Footer } from "@/components/site/footer";
import { Motion } from "@/components/site/motion";
import { JsonLd } from "@/components/site/json-ld";
import { organizationLd, websiteLd } from "@/lib/seo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Motion />
      <PublicHeader />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <JsonLd data={organizationLd} />
      <JsonLd data={websiteLd} />
    </>
  );
}
