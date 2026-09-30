"use client";
import { useParams, useRouter } from "next/navigation";
import { AuthForm, signInOrThrow } from "@/components/auth/auth-form";
import { postJson } from "@/lib/client/api";
import { PasswordInput } from "@/components/site/password-input";

export default function ResetPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  return (
    <AuthForm
      eyebrow="NOUVEAU MOT DE PASSE"
      title="Choisissez un nouveau mot de passe."
      submit="Enregistrer et me connecter"
      onSubmit={async (data) => {
        const password = String(data.get("password"));
        if (password !== data.get("confirm")) throw new Error("Les deux mots de passe ne correspondent pas.");
        const { email, superAdmin } = await postJson<{ email: string; superAdmin: boolean }>(
          "/api/account/reset",
          { token, password },
        );
        // The super-admin has its own sign-in and space.
        if (superAdmin) await postJson("/api/admin/session", { email, password });
        else await signInOrThrow(email, password);
        router.push(superAdmin ? "/super-admin" : "/app");
        router.refresh();
      }}
    >
      <label>
        Nouveau mot de passe (10 caractères minimum)
        <PasswordInput name="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label>
        Confirmez le mot de passe
        <PasswordInput name="confirm" required minLength={10} autoComplete="new-password" />
      </label>
    </AuthForm>
  );
}
