"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gameApi } from "@/lib/client/api";
import { useHydrated } from "@/lib/client/hydrated";
import { Brand } from "@/components/site/brand";

export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const ready = useHydrated();
  return (
    <div className="play-join">
      <Brand className="brand-live brand-big" />
      <section className="panel narrow">
        <p className="eyebrow">ENTRE DANS LA PARTIE</p>
        <h1 style={{ fontSize: 40 }}>À toi de jouer !</h1>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <form
          method="post"
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            // Read from the fields themselves: a player on a slow connection may have typed the code and
            // the pseudo before the page's script started, and those keystrokes never reached the state.
            const fields = new FormData(e.currentTarget);
            const code = String(fields.get("code") ?? "").replace(/\D/g, "");
            const name = String(fields.get("name") ?? "");
            setCode(code);
            setName(name);
            setBusy(true);
            setError("");
            try {
              await gameApi("join", { code, name });
              router.push(`/partie/${code}`);
            } catch (err) {
              setError((err as Error).message);
              setBusy(false);
            }
          }}
        >
          <label>
            Code de la partie
            <input
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus={!initialCode}
            />
          </label>
          <label>
            Ton pseudo
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Capitaine Curieux"
              maxLength={24}
              required
              autoComplete="nickname"
              autoFocus={!!initialCode}
            />
          </label>
          {/* The button waits for the script: sent before it, the form would only reload the page. */}
          <button disabled={busy || !ready} className="button">
            {busy ? "Connexion…" : "C’est parti !"}
          </button>
        </form>
        <p className="hint play-privacy">
          Pour jouer, SQuizz retient seulement ton pseudo et un cookie technique anonyme, effacés au bout de
          24 à 48 heures. <Link href="/confidentialite#cookies">En savoir plus</Link>
        </p>
      </section>
    </div>
  );
}
