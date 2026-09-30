import Link from "next/link";
import { Brand } from "@/components/site/brand";

const columns = [
  {
    title: "SQuizz",
    links: [
      { href: "/jouer", label: "Rejoindre une partie" },
      { href: "/tarifs", label: "Tarifs" },
      { href: "/alternative-kahoot", label: "Alternative à Kahoot!" },
      { href: "/inscription", label: "Créer un compte" },
    ],
  },
  {
    title: "Informations",
    links: [
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/cgu", label: "CGU" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
  {
    title: "Contact",
    links: [
      { href: "/#contact", label: "Parlons-en" },
      { href: "mailto:contact@pressweb.fr", label: "contact@pressweb.fr" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-intro">
          <Brand />
          <p>On joue ensemble. On brille chacun son tour.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} className="footer-column" aria-label={column.title}>
            <h2>{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href}>{link.label}</a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SQuizz</span>
        <span>
          Site conçu par <a href="https://www.pressweb.fr/">Pressweb</a>
        </span>
      </div>
    </footer>
  );
}
