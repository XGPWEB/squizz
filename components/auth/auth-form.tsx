"use client";
import { useState } from "react";

/** Form shell with busy state and a French error banner; `onSubmit` throws to show an error. */
export function AuthForm({
  title,
  eyebrow,
  submit,
  onSubmit,
  children,
  footer,
}: {
  title: string;
  eyebrow: string;
  submit: string;
  onSubmit: (data: FormData) => Promise<void>;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel narrow">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="auth-title">{title}</h1>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSubmit(new FormData(e.currentTarget));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {children}
        <button className="button" disabled={busy}>
          {busy ? "Un instant…" : submit}
        </button>
      </form>
      {footer && <div className="auth-footer">{footer}</div>}
    </section>
  );
}

export async function signInOrThrow(email: string, password: string) {
  const { signIn } = await import("next-auth/react");
  const res = await signIn("credentials", { email, password, redirect: false });
  if (!res || res.error)
    throw new Error(
      res?.error && res.error !== "CredentialsSignin" ? res.error : "Email ou mot de passe incorrect.",
    );
}
