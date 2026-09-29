"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm, signInOrThrow } from "@/components/auth/auth-form";
import { PasswordInput } from "@/components/site/password-input";

export function LoginForm({ suspended, email }: { suspended: boolean; email: string }) {
  const router = useRouter();
  return (
    <AuthForm
      eyebrow="ESPACE ORGANISATEUR"
      title="Content de te revoir."
      submit="Se connecter"
      onSubmit={async (data) => {
        await signInOrThrow(String(data.get("email")), String(data.get("password")));
        router.push("/app");
        router.refresh();
      }}
      footer={
        <>
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          <span>
            Pas encore de compte ? <Link href="/inscription">Créer un espace</Link>
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
