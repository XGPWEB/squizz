"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm, signInOrThrow } from "@/components/auth/auth-form";
import { PasswordInput } from "@/components/site/password-input";
import { VerifyPending } from "@/components/auth/verify-pending";
import { EMAIL_NOT_VERIFIED } from "@/lib/auth-messages";
import { useState } from "react";

export function LoginForm({ suspended, email, next }: { suspended: boolean; email: string; next: string }) {
  const router = useRouter();
  // Right password but address not confirmed yet: offer a new link instead of a dead end.
  const [unverified, setUnverified] = useState<string | null>(null);
  if (unverified)
    return (
      <section className="panel narrow">
        <p className="eyebrow">ADRESSE À CONFIRMER</p>
        <VerifyPending email={unverified} next={next === "/app" ? undefined : next} />
      </section>
    );
  return (
    <AuthForm
      eyebrow="ESPACE ORGANISATEUR"
      title="Content de vous revoir."
      submit="Se connecter"
      onSubmit={async (data) => {
        const address = String(data.get("email")).trim().toLowerCase();
        try {
          await signInOrThrow(address, String(data.get("password")));
        } catch (e) {
          if ((e as Error).message === EMAIL_NOT_VERIFIED) setUnverified(address);
          throw e;
        }
        router.push(next);
        router.refresh();
      }}
      footer={
        <>
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          <span>
            Pas encore de compte ?{" "}
            <Link
              href={next === "/app" ? "/inscription" : `/inscription?suite=${encodeURIComponent(next)}`}
              rel={next === "/app" ? undefined : "nofollow"}
            >
              Créer un espace
            </Link>
          </span>
        </>
      }
    >
      {suspended && (
        <p className="info-box">Votre organisation est suspendue. Contactez contact@pressweb.fr.</p>
      )}
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={email} />
      </label>
      <label>
        Mot de passe
        <PasswordInput name="password" autoComplete="current-password" required />
      </label>
    </AuthForm>
  );
}
