"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm, signInOrThrow } from "@/components/auth/auth-form";
import { postJson } from "@/lib/client/api";
import { PasswordInput } from "@/components/site/password-input";

export function SignupForm() {
  const router = useRouter();
  return (
    <AuthForm
      eyebrow="GRATUIT, SANS CARTE BANCAIRE"
      title="Créez l’espace de votre équipe."
      submit="Créer mon espace"
      onSubmit={async (data) => {
        const body = Object.fromEntries(data) as Record<string, string>;
        if (body.password !== body.confirm) throw new Error("Les deux mots de passe ne correspondent pas.");
        if (!data.get("terms")) throw new Error("Acceptez les conditions d’utilisation pour continuer.");
        await postJson("/api/account/signup", {
          organization: body.organization,
          name: body.name,
          email: body.email,
          password: body.password,
        });
        await signInOrThrow(body.email, body.password);
        router.push("/app");
        router.refresh();
      }}
      footer={
        <span>
          Déjà un compte ? <Link href="/connexion">Se connecter</Link>
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
