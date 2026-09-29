"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { postJson } from "@/lib/client/api";
import { signInOrThrow } from "@/components/auth/auth-form";
import { PasswordInput } from "@/components/site/password-input";

export function AccountForms({
  name,
  email,
  viewingAs = false,
}: {
  name: string;
  email: string;
  viewingAs?: boolean;
}) {
  const router = useRouter();
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
          className="invite-form"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("name");
            run(async () => {
              await postJson("/api/account/password", { name: value }, "PATCH");
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
          className="stack"
          style={{ maxWidth: 440 }}
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const d = new FormData(form);
            run(async () => {
              if (d.get("next") !== d.get("confirm"))
                throw new Error("Les deux mots de passe ne correspondent pas.");
              await postJson("/api/account/password", { current: d.get("current"), next: d.get("next") });
              // The change revoked every session, including this one: sign straight back in.
              await signInOrThrow(email, String(d.get("next")));
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
            Confirme le nouveau mot de passe
            <PasswordInput name="confirm" required minLength={10} autoComplete="new-password" />
          </label>
          <button className="button" disabled={busy}>
            Changer le mot de passe
          </button>
        </form>
      </section>
    </>
  );
}
