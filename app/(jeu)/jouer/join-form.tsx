"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gameApi } from "@/lib/client/api";
import { useHydrated } from "@/lib/client/hydrated";
import type { Brand } from "@/lib/brand";
import { GameMark } from "@/components/squizz/game-parts";
import { sayFor } from "@/components/squizz/voice";

export function JoinForm({ initialCode, brand }: { initialCode: string; brand: Brand | null }) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const ready = useHydrated();
  const say = sayFor(brand?.theme);
  return (
    <div
      className={`game-theme theme-${brand?.theme ?? "squizz"}`}
      style={brand ? ({ "--brand": brand.accent } as React.CSSProperties) : undefined}
    >
      <div className="play-join">
        <GameMark brand={brand ?? undefined} href="/" className="brand-live brand-big" />
        <section className="panel narrow">
          <p className="eyebrow">{say("ENTRE DANS LA PARTIE", "REJOINDRE LA PARTIE")}</p>
          <h1 style={{ fontSize: 40 }}>{say("À toi de jouer !", "À vous de jouer")}</h1>
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
              {say("Ton pseudo", "Votre pseudo")}
              <input
                name="name"
                placeholder={say("Ex. Capitaine Curieux", "Ex. Camille D.")}
                maxLength={24}
                required
                autoComplete="nickname"
                autoFocus={!!initialCode}
              />
            </label>
            {/* The button waits for the script: sent before it, the form would only reload the page. */}
            <button disabled={busy || !ready} className="button">
              {busy ? "Connexion…" : say("C’est parti !", "Rejoindre la partie")}
            </button>
          </form>
          <p className="hint play-privacy">
            {say(
              "Pour jouer, SQuizz retient seulement ton pseudo, tes réponses et un cookie technique anonyme.",
              "Pour jouer, SQuizz retient seulement votre pseudo, vos réponses et un cookie technique anonyme.",
            )}{" "}
            La partie est effacée sous 48 heures ; ses résultats sont gardés 12 mois au plus pour
            l’organisation qui l’anime. <Link href="/confidentialite">En savoir plus</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
