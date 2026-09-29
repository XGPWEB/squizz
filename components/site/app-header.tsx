import Link from "next/link";
import type { SessionUser } from "@/lib/server/guard";
import { PLANS } from "@/lib/plans";
import { Brand } from "./brand";
import { SignOutButton } from "./sign-out";

const roleLabel = { SUPER_ADMIN: "Super-admin", ORG_ADMIN: "Administrateur", HOST: "Animateur" } as const;

/** Header of the signed-in areas: the organisation dashboard and the super-admin. */
export function AppHeader({ user, area }: { user: SessionUser; area: "app" | "admin" }) {
  return (
    <header className="site-header app-header">
      <Brand href={area === "admin" ? "/admin" : "/app"} />
      <nav className="site-nav" aria-label="Navigation de l’espace">
        {area === "app" ? (
          <>
            <Link href="/app">Mes quiz</Link>
            <Link href="/app/equipe">{user.role === "HOST" ? "Organisation" : "Équipe"}</Link>
            <Link href="/app/compte">Mon compte</Link>
            {user.role === "SUPER_ADMIN" && <Link href="/admin">Super-admin</Link>}
          </>
        ) : (
          <>
            <Link href="/admin">Organisations</Link>
            <Link href="/admin/messages">Messages</Link>
            <Link href="/admin/journal">Journal</Link>
            {user.organizationId && <Link href="/app">Mon organisation</Link>}
          </>
        )}
      </nav>
      <div className="header-actions">
        <span className="who">
          <strong>{user.name}</strong>
          <small>
            {roleLabel[user.role]}
            {user.organization ? ` · ${user.organization.name} · ${PLANS[user.organization.plan].label}` : ""}
          </small>
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
