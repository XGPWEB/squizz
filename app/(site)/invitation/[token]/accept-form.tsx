"use client";
import { useRouter } from "next/navigation";
import { AuthForm, signInOrThrow } from "@/components/auth/auth-form";
import { postJson } from "@/lib/client/api";

export function AcceptForm(props: { token: string; email: string; organization: string; role: string }) {
  const router = useRouter();
  return (
    <AuthForm
      eyebrow={`INVITATION · ${props.organization.toUpperCase()}`}
      title="Bienvenue dans l’équipe !"
      submit="Créer mon compte"
      onSubmit={async (data) => {
        const password = String(data.get("password"));
        if (password !== data.get("confirm")) throw new Error("Les deux mots de passe ne correspondent pas.");
        await postJson(`/api/invitations/${props.token}`, { name: data.get("name"), password });
        await signInOrThrow(props.email, password);
        router.push("/app");
        router.refresh();
      }}
    >
      <p>
        Vous rejoignez <strong>{props.organization}</strong> en tant que <strong>{props.role}</strong>.
      </p>
      <label>
        Email
        <input value={props.email} readOnly disabled />
      </label>
      <label>
        Ton nom
        <input name="name" required maxLength={80} autoComplete="name" />
      </label>
      <label>
        Mot de passe (10 caractères minimum)
        <input name="password" type="password" required minLength={10} autoComplete="new-password" />
      </label>
      <label>
        Confirme le mot de passe
        <input name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </label>
    </AuthForm>
  );
}
