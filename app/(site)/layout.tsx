import { PublicHeader } from "@/components/site/public-header";
import { Footer } from "@/components/site/footer";
import { Motion } from "@/components/site/motion";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Motion />
      <PublicHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
