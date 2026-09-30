"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, Copy, Eye, KeyRound } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { useResource } from "@/lib/client/use-resource";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@prisma/client";

type Role = "ORG_ADMIN" | "HOST";

const stripeStatus: Record<string, string> = {
  active: "actif",
  trialing: "en période d’essai",
  past_due: "paiement en retard",
  unpaid: "impayé",
  canceled: "arrêté",
  incomplete: "paiement à finaliser",
  incomplete_expired: "paiement abandonné",
  paused: "en pause",
};
type Detail = {
  id: string;
  name: string;
  plan: Plan;
  cancelRequestedAt: string | null;
  partner: boolean;
  partnerSince: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  users: {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    lastLoginAt: string | null;
  }[];
  invitations: { id: string; email: string; role: Role; expiresAt: string }[];
  quizzes: { id: string; title: string; updatedAt: string; createdBy: { name: string } | null }[];
  mediaBytes: number;
  mediaCount: number;
};

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "Jamais");

export function OrganizationDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: org, error: loadError, reload: load } = useResource<Detail>(`/api/admin/organizations/${id}`);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState("");
  async function run(task: () => Promise<void>, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      await load();
      setMessage(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!org) return <div className="panel center">{loadError || "Chargement…"}</div>;
  return (
    <>
      <Link href="/super-admin" className="nav-link">
        <ArrowLeft size={16} /> Toutes les organisations
      </Link>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">ORGANISATION · CRÉÉE LE {date(org.createdAt)}</p>
          <h1>{org.name}</h1>
          <p className="hint">
            Offre {PLANS[org.plan].label}
            {org.partner && ` · partenaire (Premium offert depuis le ${date(org.partnerSince!)})`}
            {org.cancelRequestedAt &&
              ` (arrêt demandé le ${new Date(org.cancelRequestedAt).toLocaleDateString("fr-FR")})`}{" "}
            · {org.status === "ACTIVE" ? "active" : "suspendue"} · {org.mediaCount} médias (
            {Math.round(org.mediaBytes / 1024 / 1024)} Mo)
          </p>
        </div>
        <button
          className="button"
          disabled={busy}
          title="Ouvre l’espace de l’organisation avec les droits de son administrateur, pendant 2 heures"
          onClick={() => {
            setBusy(true);
            postJson(`/api/admin/organizations/${org.id}/view`)
              .then(() => {
                router.push("/app");
                router.refresh();
              })
              .catch((e) => {
                setError((e as Error).message);
                setBusy(false);
              });
          }}
        >
          <Eye size={18} /> Voir en tant qu’administrateur
        </button>
      </div>
      <section className="panel subscription">
        <h2>Abonnement et partenariat</h2>
        <p>
          {org.subscriptionStatus
            ? `Abonnement Stripe : ${stripeStatus[org.subscriptionStatus] ?? org.subscriptionStatus}${
                org.currentPeriodEnd ? `, période en cours jusqu’au ${date(org.currentPeriodEnd)}` : ""
              }.`
            : "Pas d’abonnement Stripe : l’offre est attribuée à la main."}
        </p>
        <p className="hint">
          {org.partner
            ? `Partenaire : l’offre ${PLANS.PREMIUM.label} est offerte, quelle que soit l’offre facturée.`
            : `Le statut partenaire offre l’offre ${PLANS.PREMIUM.label} gratuitement, sans passer par Stripe.`}
        </p>
        <button
          className={`button ${org.partner ? "secondary danger-button" : ""}`}
          disabled={busy}
          onClick={() => {
            if (
              !confirm(
                org.partner
                  ? `Retirer le statut partenaire ? ${org.name} reviendra sur l’offre ${PLANS[org.plan].label}.`
                  : `Rendre ${org.name} partenaire ? L’offre ${PLANS.PREMIUM.label} lui sera offerte.`,
              )
            )
              return;
            run(
              () =>
                postJson(`/api/admin/organizations/${org.id}`, { partner: !org.partner }, "PATCH").then(
                  () => {},
                ),
              org.partner ? "Statut partenaire retiré." : "Statut partenaire activé : Premium offert.",
            );
          }}
        >
          {org.partner ? "Retirer le statut partenaire" : "Activer le statut partenaire"}
        </button>
      </section>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="success" role="status">
          <Check size={18} /> {message}
        </div>
      )}
      {link && (
        <div className="link-box">
          <p>Lien de réinitialisation (valable 1 heure) à transmettre à l’utilisateur :</p>
          <div className="row">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Lien de réinitialisation"
            />
            <button className="button small secondary" onClick={() => navigator.clipboard?.writeText(link)}>
              <Copy size={16} /> Copier
            </button>
          </div>
        </div>
      )}
      <section className="panel">
        <h2>Membres</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Dernière connexion</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {org.users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "muted"}>
                  <td>
                    <strong>{u.name}</strong>
                    <br />
                    <small>{u.email}</small>
                  </td>
                  <td>
                    <select
                      aria-label={`Rôle de ${u.name}`}
                      value={u.role}
                      disabled={busy}
                      onChange={(e) =>
                        run(
                          () =>
                            postJson(`/api/admin/users/${u.id}`, { role: e.target.value }, "PATCH").then(
                              () => {},
                            ),
                          "Rôle mis à jour.",
                        )
                      }
                    >
                      <option value="HOST">Animateur</option>
                      <option value="ORG_ADMIN">Administrateur</option>
                    </select>
                  </td>
                  <td>{date(u.lastLoginAt)}</td>
                  <td>
                    <button
                      className={`status ${u.active ? "on" : "off"}`}
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            postJson(`/api/admin/users/${u.id}`, { active: !u.active }, "PATCH").then(
                              () => {},
                            ),
                          u.active ? "Compte désactivé." : "Compte réactivé.",
                        )
                      }
                    >
                      {u.active ? "Actif" : "Désactivé"}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="button small secondary"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            const r = await postJson<{ link: string }>(`/api/admin/users/${u.id}/reset`);
                            setLink(r.link);
                          }, `Lien de réinitialisation créé pour ${u.name}.`)
                        }
                      >
                        <KeyRound size={16} /> Lien de mot de passe
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {org.invitations.length > 0 && (
          <p className="hint">
            Invitations en attente :{" "}
            {org.invitations.map((i) => `${i.email} (expire le ${date(i.expiresAt)})`).join(", ")}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Quiz ({org.quizzes.length})</h2>
        {org.quizzes.length ? (
          <ul className="plain-list">
            {org.quizzes.map((q) => (
              <li key={q.id}>
                <span>
                  <strong>{q.title}</strong> · {q.createdBy?.name ?? "auteur supprimé"} · modifié le{" "}
                  {date(q.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Aucun quiz.</p>
        )}
      </section>
      <section className="panel danger-zone">
        <h2>Zone sensible</h2>
        <p>La suppression efface définitivement l’organisation, ses membres, ses quiz et ses parties.</p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => {
            const confirmName = prompt(`Pour confirmer, saisissez le nom exact : ${org.name}`);
            if (confirmName === null) return;
            setBusy(true);
            postJson(`/api/admin/organizations/${org.id}`, { confirm: confirmName }, "DELETE")
              .then(() => router.push("/super-admin"))
              .catch((e) => {
                setError((e as Error).message);
                setBusy(false);
              });
          }}
        >
          Supprimer l’organisation
        </button>
      </section>
    </>
  );
}
