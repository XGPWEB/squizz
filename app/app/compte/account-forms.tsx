"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Download, Trash2 } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { signInOrThrow } from "@/components/auth/auth-form";
import { signOut } from "next-auth/react";
import { PasswordInput } from "@/components/site/password-input";

export function AccountForms({
  name,
  email,
  viewingAs = false,
  superAdmin = false,
}: {
  name: string;
  email: string;
  viewingAs?: boolean;
  /** The super-admin's own account, on its separate session. */
  superAdmin?: boolean;
}) {
  const router = useRouter();
  const api = (path: string) => (superAdmin ? `${path}?espace=super-admin` : path);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(task: () => Promise<void>, done: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage(done);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="dash-heading">
        <div>
          <p className="eyebrow">MON COMPTE</p>
          <h1>{name}</h1>
          <p className="hint">{email}</p>
        </div>
      </div>
      {viewingAs && (
        <p className="info-box">
          Vous êtes en vue administrateur d’une organisation. Quittez cette vue (bandeau rose en haut) pour
          modifier votre compte.
        </p>
      )}
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
      <section className="panel">
        <h2>Profil</h2>
        <form
          method="post"
          className="invite-form"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("name");
            run(async () => {
              await postJson(api("/api/account/password"), { name: value }, "PATCH");
              router.refresh();
            }, "Nom mis à jour.");
          }}
        >
          <label>
            Nom affiché
            <input name="name" defaultValue={name} required maxLength={80} />
          </label>
          <button className="button secondary" disabled={busy}>
            Enregistrer
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Mot de passe</h2>
        <form
          method="post"
          className="stack"
          style={{ maxWidth: 440 }}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const d = new FormData(form);
            run(async () => {
              if (d.get("next") !== d.get("confirm"))
                throw new Error("Les deux mots de passe ne correspondent pas.");
              await postJson(api("/api/account/password"), {
                current: d.get("current"),
                next: d.get("next"),
              });
              // The change revoked every session, including this one: sign straight back in.
              if (superAdmin)
                await postJson("/api/admin/session", { email, password: String(d.get("next")) });
              else await signInOrThrow(email, String(d.get("next")));
              form.reset();
            }, "Mot de passe modifié. Vos autres appareils ont été déconnectés.");
          }}
        >
          <label>
            Mot de passe actuel
            <PasswordInput name="current" required autoComplete="current-password" />
          </label>
          <label>
            Nouveau mot de passe (10 caractères minimum)
            <PasswordInput name="next" required minLength={10} autoComplete="new-password" />
          </label>
          <label>
            Confirmez le nouveau mot de passe
            <PasswordInput name="confirm" required minLength={10} autoComplete="new-password" />
          </label>
          <button className="button" disabled={busy}>
            Changer le mot de passe
          </button>
        </form>
      </section>
      {!viewingAs && !superAdmin && (
        <section className="panel">
          <h2>Mes données</h2>
          <p>
            Téléchargez une copie de votre compte et des quiz que vous avez créés (format JSON). Pour toute
            autre demande (rectification, opposition…), écrivez à{" "}
            <a href="mailto:contact@pressweb.fr">contact@pressweb.fr</a>.
          </p>
          <a className="button secondary" href="/api/account/export" download>
            <Download size={18} /> Exporter mes données
          </a>
          <h3 style={{ marginTop: 28 }}>Supprimer mon compte</h3>
          <p className="hint">
            Définitif. Vos quiz restent à l’organisation. Si vous en êtes le seul membre, l’organisation, ses
            quiz et ses médias sont supprimés aussi.
          </p>
          <form
            method="post"
            className="invite-form"
            onSubmit={(e) => {
              e.preventDefault();
              const password = String(new FormData(e.currentTarget).get("password"));
              if (!confirm("Supprimer définitivement votre compte ? Cette action est irréversible.")) return;
              run(async () => {
                await postJson("/api/account", { password }, "DELETE");
                await signOut({ callbackUrl: "/" });
              }, "Compte supprimé.");
            }}
          >
            <label>
              Mot de passe, pour confirmer
              <PasswordInput name="password" required autoComplete="current-password" />
            </label>
            <button className="button secondary danger-button" disabled={busy}>
              <Trash2 size={18} /> Supprimer mon compte
            </button>
          </form>
        </section>
      )}
    </>
  );
}
