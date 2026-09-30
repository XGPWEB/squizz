"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { PasswordInput } from "@/components/site/password-input";
import { postJson } from "@/lib/client/api";

export function AdminLoginForm() {
  const router = useRouter();
  return (
    <AuthForm
      eyebrow="ESPACE SUPER-ADMIN"
      title="Console Pressweb."
      submit="Entrer dans la console"
      onSubmit={async (data) => {
        await postJson("/api/admin/session", { email: data.get("email"), password: data.get("password") });
        router.push("/super-admin");
        router.refresh();
      }}
      footer={
        <>
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          <span>Session séparée de votre compte client : les deux peuvent rester ouverts.</span>
        </>
      }
    >
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Mot de passe
        <PasswordInput name="password" autoComplete="current-password" required />
      </label>
    </AuthForm>
  );
}
