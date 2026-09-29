import Link from "next/link";
import { getSessionUser } from "@/lib/server/guard";
import { Brand } from "./brand";

/** Header of the marketing site and the player pages; adapts to a signed-in visitor. */
export async function PublicHeader() {
  const user = await getSessionUser();
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Navigation principale">
        <Link href="/#fonctionnalites">Fonctionnalités</Link>
        <Link href="/tarifs">Tarifs</Link>
        <Link href="/jouer">Rejoindre une partie</Link>
        <Link href="/#contact">Contact</Link>
      </nav>
      <div className="header-actions">
        {user ? (
          <Link
            className="button small"
            href={user.role === "SUPER_ADMIN" && !user.organizationId ? "/admin" : "/app"}
          >
            Mon espace
          </Link>
        ) : (
          <>
            <Link className="button small secondary" href="/connexion">
              Connexion
            </Link>
            <Link className="button small" href="/inscription">
              Créer un compte
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
