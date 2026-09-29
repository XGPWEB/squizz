"use client";
import Link from "next/link";
import { useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { postJson } from "@/lib/client/api";

export default function ForgotPage() {
  const [sent, setSent] = useState(false);
  if (sent)
    return (
      <section className="panel narrow">
        <p className="eyebrow">MOT DE PASSE OUBLIÉ</p>
        <h1 className="auth-title">Vérifie ta boîte mail.</h1>
        <p>
          Si un compte existe avec cette adresse, un lien de réinitialisation valable une heure vient d’être
          envoyé.
        </p>
        <Link className="button secondary" href="/connexion">
          Retour à la connexion
        </Link>
      </section>
    );
  return (
    <AuthForm
      eyebrow="MOT DE PASSE OUBLIÉ"
      title="On t’envoie un lien."
      submit="Envoyer le lien"
      onSubmit={async (data) => {
        await postJson("/api/account/forgot", { email: data.get("email") });
        setSent(true);
      }}
      footer={<Link href="/connexion">Retour à la connexion</Link>}
    >
      <label>
        Email du compte
        <input name="email" type="email" required autoComplete="email" />
      </label>
    </AuthForm>
  );
}
