import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/site/public-header";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="panel narrow center status-page">
          <span className="status-code" aria-hidden="true">
            404
          </span>
          <h1>Cette page a quitté la partie.</h1>
          <p>Le lien est peut-être incomplet, ou la page n’existe plus.</p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="button" href="/">
              Retour à l’accueil
            </Link>
            <Link className="button secondary" href="/jouer">
              Rejoindre une partie
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
