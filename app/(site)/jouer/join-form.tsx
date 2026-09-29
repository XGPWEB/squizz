"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { gameApi } from "@/lib/client/api";

export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="panel narrow">
      <p className="eyebrow">ENTREZ DANS LA PARTIE</p>
      <h1 style={{ fontSize: 40 }}>À toi de jouer !</h1>
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Capitaine Curieux"
            maxLength={24}
            required
            autoComplete="nickname"
            autoFocus={!!initialCode}
          />
        </label>
        <button disabled={busy} className="button">
          {busy ? "Connexion…" : "C’est parti !"}
        </button>
      </form>
    </section>
  );
}
