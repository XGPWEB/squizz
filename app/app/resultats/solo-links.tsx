"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy, Link2, Lock } from "lucide-react";
import { gameApi } from "@/lib/client/api";

type Solo = {
  id: string;
  title: string;
  createdAt: string;
  expiresAt: string;
  open: boolean;
  players: number;
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });

/** The self-paced links of the organisation: still open or not, how many played, copy or close them. */
export function SoloLinks({ solos }: { solos: Solo[] }) {
  const router = useRouter();
  const [copied, setCopied] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!solos.length) return null;
  return (
    <section className="solo-links">
      <h2>Liens en autonomie</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ul>
        {solos.map((s) => (
          <li key={s.id} className={s.open ? "" : "closed"}>
            <Link2 size={18} aria-hidden />
            <span className="solo-links-main">
              <strong>{s.title}</strong>
              <small>
                {s.players} participant{s.players > 1 ? "s" : ""} ·{" "}
                {s.open ? `ouvert jusqu’au ${day(s.expiresAt)}` : "fermé"}
              </small>
            </span>
            {s.open && (
              <>
                <button
                  type="button"
                  className="button small secondary"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(`${window.location.origin}/solo/${s.id}`);
                    setCopied(s.id);
                    setTimeout(() => setCopied(""), 2000);
                  }}
                >
                  {copied === s.id ? <Check size={15} /> : <Copy size={15} />}{" "}
                  {copied === s.id ? "Copié" : "Copier le lien"}
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  aria-label={`Fermer le lien de ${s.title}`}
                  title="Fermer le lien : il ne pourra plus être joué"
                  onClick={async () => {
                    if (
                      !confirm(
                        `Fermer le lien de « ${s.title} » ? Il ne pourra plus être joué ; les résultats restent.`,
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      await gameApi("solo-close", { id: s.id });
                      router.refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Lock size={16} /> Fermer
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
