"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { postJson } from "@/lib/client/api";

/**
 * Confirms the address when the page opens in a browser (a POST from the page, so a mail scanner that
 * only fetches the link does not use it up), then leads to sign-in.
 */
export function VerifyEmail({ token, next }: { token: string; next: string }) {
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ok"; email: string } | { kind: "error"; message: string }
  >({
    kind: "loading",
  });
  useEffect(() => {
    let active = true;
    postJson<{ email: string }>("/api/account/verify", { token })
      .then(({ email }) => active && setState({ kind: "ok", email }))
      .catch((e: Error) => active && setState({ kind: "error", message: e.message }));
    return () => {
      active = false;
    };
  }, [token]);
  const login = (email?: string) =>
    `/connexion?${new URLSearchParams({ ...(email && { email }), ...(next !== "/app" && { suite: next }) })}`;
  return (
    <section className="panel narrow center" role="status" aria-live="polite">
      {state.kind === "loading" ? (
        <p>Confirmation de votre adresse…</p>
      ) : state.kind === "ok" ? (
        <>
          <p className="eyebrow">C’EST CONFIRMÉ</p>
          <h1 className="auth-title">Bienvenue sur SQuizz !</h1>
          <p>Votre adresse {state.email} est confirmée. Connectez-vous pour ouvrir votre espace.</p>
          <Link className="button" href={login(state.email)}>
            Me connecter
          </Link>
        </>
      ) : (
        <>
          <p className="eyebrow">LIEN EXPIRÉ</p>
          <h1 className="auth-title">Ce lien ne fonctionne plus.</h1>
          <p>{state.message}</p>
          <Link className="button" href={login()}>
            Me connecter pour recevoir un nouveau lien
          </Link>
        </>
      )}
    </section>
  );
}
