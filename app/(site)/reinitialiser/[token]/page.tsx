"use client";
import { useParams, useRouter } from "next/navigation";
import { AuthForm, signInOrThrow } from "@/components/auth/auth-form";
import { postJson } from "@/lib/client/api";

export default function ResetPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  return (
    <AuthForm
      eyebrow="NOUVEAU MOT DE PASSE"
      title="Choisis un nouveau mot de passe."
      submit="Enregistrer et me connecter"
      onSubmit={async (data) => {
        const password = String(data.get("password"));
        if (password !== data.get("confirm")) throw new Error("Les deux mots de passe ne correspondent pas.");
        const { email } = await postJson<{ email: string }>("/api/account/reset", { token, password });
        await signInOrThrow(email, password);
        router.push("/app");
        router.refresh();
      }}
    >
      <label>
        Nouveau mot de passe (10 caractères minimum)
        <input name="password" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label>
        Confirme le mot de passe
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </label>
    </AuthForm>
  );
}
