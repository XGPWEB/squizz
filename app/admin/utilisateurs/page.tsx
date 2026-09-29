import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Utilisateurs" };

const roleLabel = { SUPER_ADMIN: "Super-admin", ORG_ADMIN: "Administrateur", HOST: "Animateur" } as const;

/** Finds any account by name or email, whatever its organisation. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { organization: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { organization: { select: { id: true, name: true, status: true } } },
    orderBy: q ? { name: "asc" } : { createdAt: "desc" },
    take: 100,
  });
  const total = await prisma.user.count();
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">SUPER-ADMIN</p>
          <h1>Utilisateurs</h1>
          <p className="hint">
            {total} compte{total > 1 ? "s" : ""} au total ·{" "}
            {q
              ? `${users.length} résultat${users.length > 1 ? "s" : ""} pour « ${q} »`
              : "les 100 plus récents"}
          </p>
        </div>
      </div>
      <form className="search-bar" role="search">
        <Search size={20} aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Email, nom ou organisation…"
          aria-label="Rechercher un utilisateur"
          autoFocus
        />
        <button className="button small">Rechercher</button>
      </form>
      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Organisation</th>
                <th>Rôle</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "muted"}>
                  <td>
                    <strong>{u.name}</strong>
                    <br />
                    <small>{u.email}</small>
                  </td>
                  <td>
                    {u.organization ? (
                      <Link href={`/admin/organisations/${u.organization.id}`}>{u.organization.name}</Link>
                    ) : (
                      "—"
                    )}
                    {u.organization?.status === "SUSPENDED" && <small> (suspendue)</small>}
                  </td>
                  <td>{roleLabel[u.role]}</td>
                  <td>{u.lastLoginAt ? u.lastLoginAt.toLocaleDateString("fr-FR") : "Jamais"}</td>
                  <td>
                    <span className={`status ${u.active ? "on" : "off"}`}>
                      {u.active ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td>
                    {u.role !== "SUPER_ADMIN" && <UserActions id={u.id} name={u.name} active={u.active} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.length && <p className="hint">Aucun utilisateur ne correspond.</p>}
        </div>
      </section>
    </>
  );
}
