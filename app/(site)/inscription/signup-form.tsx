"use client";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { postJson } from "@/lib/client/api";
import { PasswordInput } from "@/components/site/password-input";
import { VerifyPending } from "@/components/auth/verify-pending";
import { useState } from "react";

export function SignupForm({ next }: { next: string }) {
  const [pending, setPending] = useState<{ email: string; devLink?: string } | null>(null);
  if (pending)
    return (
      <section className="panel narrow">
        <p className="eyebrow">DERNIÈRE ÉTAPE</p>
        <VerifyPending
          email={pending.email}
          next={next === "/app" ? undefined : next}
          devLink={pending.devLink}
        />
      </section>
    );
  return (
    <AuthForm
      eyebrow="GRATUIT, SANS CARTE BANCAIRE"
      title="Créez l’espace de votre équipe."
      submit="Créer mon espace"
      onSubmit={async (data) => {
        const body = Object.fromEntries(data) as Record<string, string>;
        if (body.password !== body.confirm) throw new Error("Les deux mots de passe ne correspondent pas.");
        if (!data.get("terms")) throw new Error("Acceptez les conditions d’utilisation pour continuer.");
        const out = await postJson<{ devLink?: string }>("/api/account/signup", {
          organization: body.organization,
          name: body.name,
          email: body.email,
          password: body.password,
          suite: next === "/app" ? undefined : next,
        });
        setPending({ email: body.email.trim().toLowerCase(), devLink: out.devLink });
      }}
      footer={
        <span>
          Déjà un compte ?{" "}
          <Link href={next === "/app" ? "/connexion" : `/connexion?suite=${encodeURIComponent(next)}`}>
            Se connecter
          </Link>
        </span>
      }
    >
      <label>
        Nom de l’organisation
        <input name="organization" required maxLength={80} placeholder="Ex. Lycée Jean Moulin, Acme…" />
      </label>
      <label>
        Votre nom
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label>
        Email professionnel
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Mot de passe (10 caractères minimum)
        <PasswordInput name="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label>
        Confirmez le mot de passe
        <PasswordInput name="confirm" required minLength={10} autoComplete="new-password" />
      </label>
      <label className="check-line">
        <input type="checkbox" name="terms" required /> J’accepte les{" "}
        <Link href="/cgu" target="_blank">
          conditions d’utilisation
        </Link>
        .
      </label>
    </AuthForm>
  );
}
