import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Journal" };

const labels: Record<string, string> = {
  "organization.create": "Organisation créée",
  "organization.update": "Organisation modifiée",
  "organization.rename": "Organisation renommée",
  "organization.delete": "Organisation supprimée",
  "invitation.create": "Invitation envoyée",
  "member.update": "Membre modifié",
  "organization.appearance": "Apparence des parties modifiée",
  "organization.ai": "Compte IA connecté ou modifié",
  "organization.ai_removed": "Compte IA retiré",
  "member.delete": "Membre supprimé",
  "user.update": "Utilisateur modifié",
  "user.reset_link": "Lien de mot de passe créé",
};

export default async function JournalPage() {
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { organization: { select: { name: true } } },
  });
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">SUPER-ADMIN</p>
          <h1>Journal des actions</h1>
          <p className="hint">Les 200 dernières actions sensibles, toutes organisations confondues.</p>
        </div>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Par</th>
                <th>Organisation</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.createdAt.toLocaleString("fr-FR")}</td>
                  <td>{labels[e.action] ?? e.action}</td>
                  <td>{e.actorEmail}</td>
                  <td>{e.organization?.name ?? "—"}</td>
                  <td>
                    <code>{e.details ? JSON.stringify(e.details) : ""}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!entries.length && <p className="hint">Aucune action pour l’instant.</p>}
        </div>
      </section>
    </>
  );
}
