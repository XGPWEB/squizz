"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { useResource } from "@/lib/client/use-resource";
import { PLAN_KEYS, PLANS } from "@/lib/plans";
import type { Plan } from "@prisma/client";

type Org = {
  id: string;
  name: string;
  plan: Plan;
  cancelRequestedAt: string | null;
  partner: boolean;
  subscriptionStatus: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  members: number;
  quizzes: number;
  gamesToday: number;
  mediaBytes: number;
};

export function Organizations() {
  const {
    data,
    error: loadError,
    reload: load,
  } = useResource<{ organizations: Org[] }>("/api/admin/organizations");
  const orgs = data?.organizations ?? null;
  const [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false),
    [link, setLink] = useState("");
  const shown = useMemo(
    () => orgs?.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase())) ?? [],
    [orgs, query],
  );
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
  const patch = (id: string, body: object, done: string) =>
    run(() => postJson(`/api/admin/organizations/${id}`, body, "PATCH").then(() => {}), done);

  return (
    <section className="panel">
      <div className="row spaced">
        <h2>Organisations</h2>
        <div className="row">
          <input
            type="search"
            placeholder="Rechercher…"
            aria-label="Rechercher une organisation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="button small" onClick={() => setCreating((v) => !v)}>
            <Plus size={16} /> Nouvelle organisation
          </button>
        </div>
      </div>
      {(error || loadError) && (
        <div className="error" role="alert">
          {error || loadError}
        </div>
      )}
      {message && (
        <div className="success" role="status">
          <Check size={18} /> {message}
        </div>
      )}
      {creating && (
        <form
          className="invite-form boxed"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            run(async () => {
              const r = await postJson<{ link: string }>("/api/admin/organizations", {
                name: d.get("name"),
                adminEmail: d.get("adminEmail"),
                plan: d.get("plan"),
              });
              setLink(r.link);
              setCreating(false);
            }, "Organisation créée. Transmettez le lien d’invitation à son administrateur.");
          }}
        >
          <label>
            Nom
            <input name="name" required maxLength={80} />
          </label>
          <label>
            Email de l’administrateur
            <input name="adminEmail" type="email" required />
          </label>
          <label>
            Offre
            <select name="plan" defaultValue="FREE">
              {PLAN_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PLANS[k].label}
                </option>
              ))}
            </select>
          </label>
          <button className="button" disabled={busy}>
            Créer et inviter
          </button>
        </form>
      )}
      {link && (
        <div className="link-box">
          <p>Lien d’invitation de l’administrateur (7 jours) :</p>
          <div className="row">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Lien d’invitation"
            />
            <button className="button small secondary" onClick={() => navigator.clipboard?.writeText(link)}>
              <Copy size={16} /> Copier
            </button>
          </div>
        </div>
      )}
      {!orgs ? (
        <p>Chargement…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Offre</th>
                <th>Statut</th>
                <th>Partenaire</th>
                <th>Membres</th>
                <th>Quiz</th>
                <th>Parties 24 h</th>
                <th>Médias</th>
                <th>Créée le</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className={o.status === "SUSPENDED" ? "muted" : ""}>
                  <td>
                    <Link href={`/super-admin/organisations/${o.id}`}>
                      <strong>{o.name}</strong>
                    </Link>
                  </td>
                  <td>
                    <select
                      aria-label={`Offre de ${o.name}`}
                      value={o.plan}
                      disabled={busy}
                      onChange={(e) =>
                        patch(o.id, { plan: e.target.value }, `Offre de ${o.name} mise à jour.`)
                      }
                    >
                      {PLAN_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {PLANS[k].label}
                        </option>
                      ))}
                    </select>
                    {o.subscriptionStatus && (
                      <span className="stripe-flag" title={`Abonnement Stripe : ${o.subscriptionStatus}`}>
                        Stripe
                      </span>
                    )}
                    {o.cancelRequestedAt && (
                      <span
                        className="cancel-flag"
                        title={`Arrêt demandé le ${new Date(o.cancelRequestedAt).toLocaleDateString("fr-FR")}`}
                      >
                        Arrêt demandé
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`status ${o.status === "ACTIVE" ? "on" : "off"}`}
                      disabled={busy}
                      title={o.status === "ACTIVE" ? "Cliquer pour suspendre" : "Cliquer pour réactiver"}
                      onClick={() => {
                        if (
                          o.status === "ACTIVE" &&
                          !confirm(`Suspendre ${o.name} ? Tous ses membres seront déconnectés.`)
                        )
                          return;
                        patch(
                          o.id,
                          { status: o.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" },
                          o.status === "ACTIVE" ? `${o.name} est suspendue.` : `${o.name} est réactivée.`,
                        );
                      }}
                    >
                      {o.status === "ACTIVE" ? "Active" : "Suspendue"}
                    </button>
                  </td>
                  <td>
                    <button
                      className={`status partner-toggle ${o.partner ? "on" : "off"}`}
                      disabled={busy}
                      title={
                        o.partner
                          ? "Cliquer pour retirer le statut partenaire"
                          : "Premium offert : cliquer pour activer"
                      }
                      onClick={() => {
                        if (
                          !confirm(
                            o.partner
                              ? `Retirer le statut partenaire de ${o.name} ? L’organisation reviendra sur son offre ${PLANS[o.plan].label}.`
                              : `Rendre ${o.name} partenaire ? L’offre ${PLANS.PREMIUM.label} lui sera offerte.`,
                          )
                        )
                          return;
                        patch(
                          o.id,
                          { partner: !o.partner },
                          o.partner
                            ? `${o.name} n’est plus partenaire.`
                            : `${o.name} est partenaire : Premium offert.`,
                        );
                      }}
                    >
                      {o.partner ? "Partenaire" : "Non"}
                    </button>
                  </td>
                  <td>{o.members}</td>
                  <td>{o.quizzes}</td>
                  <td>{o.gamesToday}</td>
                  <td>{Math.round(o.mediaBytes / 1024 / 1024)} Mo</td>
                  <td>{new Date(o.createdAt).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="hint">Aucune organisation.</p>}
        </div>
      )}
    </section>
  );
}
