import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/company-info";

export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        SQUIZZ · ON JOUE ENSEMBLE. ON BRILLE CHACUN SON TOUR.
        <br />
        Site conçu par <a href="https://www.pressweb.fr/">Pressweb</a>
      </p>
      <nav aria-label="Liens légaux">
        <Link href="/tarifs">Tarifs</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgu">CGU</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
      </nav>
    </footer>
  );
}
