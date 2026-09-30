"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Mail, Trash2, UserPlus, X } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { useResource } from "@/lib/client/use-resource";
import type { Plan } from "@prisma/client";
import type { PlanLimits } from "@/lib/plans";

type Role = "ORG_ADMIN" | "HOST";
type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
};
type Overview = {
  organization: {
    id: string;
    name: string;
    plan: Plan;
    limits: PlanLimits;
    cancelRequestedAt: string | null;
    partner: boolean;
  };
  me: { id: string; role: Role | "SUPER_ADMIN" };
  members: Member[];
  invitations: { id: string; email: string; role: Role; expiresAt: string }[];
  usage: { quizzes: number; members: number; mediaBytes: number };
};

const roleLabel: Record<Role, string> = { ORG_ADMIN: "Administrateur", HOST: "Animateur" };
const mb = (b: number) =>
  b >= 1024 ** 3 ? `${Math.round((b / 1024 ** 3) * 10) / 10} Go` : `${Math.round(b / 1024 / 1024)} Mo`;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "Jamais");

export function TeamManager() {
  const { data, error: loadError, reload: load } = useResource<Overview>("/api/org");
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState(""),
    [orgNameDraft, setOrgName] = useState<string | null>(null);
  const orgName = orgNameDraft ?? data?.organization.name ?? "";

  async function run(task: () => Promise<void>, done?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      await load();
      if (done) setMessage(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="panel center">{loadError || "Chargement…"}</div>;
  const admin = data.me.role !== "HOST";
  const { limits } = data.organization;

  return (
    <>
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
      <div className="dash-heading">
        <div>
          <p className="eyebrow">{admin ? "GESTION DES DROITS" : "TON ORGANISATION"}</p>
          <h1>{data.organization.name}</h1>
          <p className="hint">
            Offre : {data.organization.partner ? "Partenaire (Premium offert)" : limits.label} ·{" "}
            {admin ? (
              <Link href="/app/abonnement">Gérer l’abonnement</Link>
            ) : (
              <Link href="/tarifs">Voir les offres</Link>
            )}
          </p>
        </div>
      </div>

      <div className="usage-grid">
        <Usage label="Quiz" used={data.usage.quizzes} max={limits.maxQuizzes} />
        <Usage label="Membres actifs" used={data.usage.members} max={limits.maxMembers} />
        <Usage label="Médias" used={data.usage.mediaBytes} max={limits.mediaBytes} format={mb} />
        <div className="usage">
          <span>Joueurs par partie</span>
          <strong>{limits.maxPlayersPerGame}</strong>
        </div>
      </div>

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
                {admin && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => {
                const self = m.id === data.me.id;
                return (
                  <tr key={m.id} className={m.active ? "" : "muted"}>
                    <td>
                      <strong>{m.name}</strong>
                      {self && " (vous)"}
                      <br />
                      <small>{m.email}</small>
                    </td>
                    <td>
                      {admin && !self ? (
                        <select
                          aria-label={`Rôle de ${m.name}`}
                          value={m.role}
                          disabled={busy}
                          onChange={(e) =>
                            run(
                              () =>
                                postJson(`/api/org/members/${m.id}`, { role: e.target.value }, "PATCH").then(
                                  () => {},
                                ),
                              "Rôle mis à jour.",
                            )
                          }
                        >
                          <option value="HOST">Animateur</option>
                          <option value="ORG_ADMIN">Administrateur</option>
                        </select>
                      ) : (
                        roleLabel[m.role]
                      )}
                    </td>
                    <td>{date(m.lastLoginAt)}</td>
                    <td>
                      <span className={`status ${m.active ? "on" : "off"}`}>
                        {m.active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    {admin && (
                      <td>
                        <div className="row-actions">
                          {!self && (
                            <>
                              <button
                                className="button small secondary"
                                disabled={busy}
                                onClick={() =>
                                  run(
                                    () =>
                                      postJson(
                                        `/api/org/members/${m.id}`,
                                        { active: !m.active },
                                        "PATCH",
                                      ).then(() => {}),
                                    m.active ? "Compte désactivé." : "Compte réactivé.",
                                  )
                                }
                              >
                                {m.active ? "Désactiver" : "Réactiver"}
                              </button>
                              <button
                                className="card-action danger"
                                title="Supprimer"
                                aria-label={`Supprimer ${m.name}`}
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !confirm(
                                      `Supprimer définitivement le compte de ${m.name} ? Ses quiz restent dans l’organisation.`,
                                    )
                                  )
                                    return;
                                  run(
                                    () =>
                                      postJson(`/api/org/members/${m.id}`, undefined, "DELETE").then(
                                        () => {},
                                      ),
                                    "Membre supprimé.",
                                  );
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!admin && <p className="hint">Seuls les administrateurs peuvent inviter ou gérer les membres.</p>}
      </section>

      {admin && (
        <section className="panel">
          <h2>
            <UserPlus size={22} style={{ display: "inline", verticalAlign: "-3px" }} /> Inviter un membre
          </h2>
          <form
            className="invite-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const target = e.currentTarget;
              run(async () => {
                const r = await postJson<{ link: string; sent: boolean }>("/api/org/invitations", {
                  email: form.get("email"),
                  role: form.get("role"),
                });
                setLink(r.link);
                target.reset();
              }, "Invitation créée.");
            }}
          >
            <label>
              Email
              <input name="email" type="email" required placeholder="prenom@exemple.fr" />
            </label>
            <label>
              Rôle
              <select name="role" defaultValue="HOST">
                <option value="HOST">Animateur — crée ses quiz et lance des parties</option>
                <option value="ORG_ADMIN">Administrateur — gère aussi l’équipe et tous les quiz</option>
              </select>
            </label>
            <button className="button" disabled={busy}>
              <Mail size={18} /> Inviter
            </button>
          </form>
          {link && (
            <div className="link-box">
              <p>
                Lien d’invitation (valable 7 jours) — envoyé par email si le serveur est configuré, sinon
                partagez-le :
              </p>
              <div className="row">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Lien d’invitation"
                />
                <button
                  className="button small secondary"
                  onClick={() => navigator.clipboard?.writeText(link)}
                >
                  <Copy size={16} /> Copier
                </button>
              </div>
            </div>
          )}
          {data.invitations.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Invitations en attente</h3>
              <ul className="plain-list">
                {data.invitations.map((i) => (
                  <li key={i.id}>
                    <span>
                      {i.email} · {roleLabel[i.role]} · expire le {date(i.expiresAt)}
                    </span>
                    <button
                      className="text-button"
                      aria-label={`Annuler l’invitation de ${i.email}`}
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => postJson(`/api/org/invitations/${i.id}`, undefined, "DELETE").then(() => {}),
                          "Invitation annulée.",
                        )
                      }
                    >
                      <X size={16} /> Annuler
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {admin && (
        <section className="panel">
          <h2>Organisation</h2>
          <form
            className="invite-form"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => postJson("/api/org", { name: orgName }, "PATCH").then(() => {}), "Nom mis à jour.");
            }}
          >
            <label>
              Nom de l’organisation
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} required maxLength={80} />
            </label>
            <button className="button secondary" disabled={busy}>
              Enregistrer
            </button>
          </form>
          <p className="hint">
            Pour changer d’offre, écrivez à <a href="mailto:contact@pressweb.fr">contact@pressweb.fr</a>.
          </p>
        </section>
      )}
    </>
  );
}

function Usage({
  label,
  used,
  max,
  format = String,
}: {
  label: string;
  used: number;
  max: number | null;
  format?: (n: number) => string;
}) {
  const pct = max ? Math.min(100, (100 * used) / max) : 0;
  return (
    <div className="usage">
      <span>{label}</span>
      <strong>
        {format(used)}
        {max !== null && <small> / {format(max)}</small>}
      </strong>
      {max !== null && (
        <div className="bar-track" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
