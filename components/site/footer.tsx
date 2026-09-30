import Link from "next/link";

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
        <Link href="/alternative-kahoot">Alternative à Kahoot!</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/cgu">CGU</Link>
        <Link href="/confidentialite">Confidentialité</Link>
        <Link href="/#contact">Contact</Link>
      </nav>
    </footer>
  );
}
