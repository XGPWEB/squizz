"use client";
import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page crashes; the details go to the server logs, never to the visitor. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main>
      <section className="panel narrow center status-page" role="alert">
        <span className="status-code" aria-hidden="true">
          Oups
        </span>
        <h1>Quelque chose s’est mal passé.</h1>
        <p>Réessayez dans un instant. Si le problème continue, écrivez-nous à contact@pressweb.fr.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="button" onClick={reset}>
            Réessayer
          </button>
          <Link className="button secondary" href="/">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
