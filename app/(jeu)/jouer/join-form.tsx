"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gameApi } from "@/lib/client/api";
import { useHydrated } from "@/lib/client/hydrated";
import { Brand } from "@/components/site/brand";

export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [error, setError] = useState(""),
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
            // The two fields are left to the browser and read here: a player on a slow connection may type
            // the code and the pseudo before the page's script has started. Fields driven by React would be
            // emptied when it starts, and the form would then refuse to leave without a word.
            const fields = new FormData(e.currentTarget);
            const code = String(fields.get("code") ?? "").replace(/\D/g, "");
            const name = String(fields.get("name") ?? "");
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
              defaultValue={initialCode}
              onInput={(e) => {
                const digits = e.currentTarget.value.replace(/\D/g, "");
                if (digits !== e.currentTarget.value) e.currentTarget.value = digits;
              }}
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
          Pour jouer, SQuizz retient seulement ton pseudo, tes réponses et un cookie technique anonyme. La
          partie est effacée sous 48 heures ; ses résultats sont gardés 12 mois au plus pour l’organisation
          qui l’anime. <Link href="/confidentialite">En savoir plus</Link>
        </p>
      </section>
    </div>
  );
}
