"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Mail, RotateCcw, Trash2 } from "lucide-react";
import { postJson } from "@/lib/client/api";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  handled: boolean;
  createdAt: string;
};

export function Messages({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await task();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!messages.length) return <section className="panel">Aucun message pour l’instant.</section>;
  return (
    <>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="message-list">
        {messages.map((m) => (
          <article key={m.id} className={`panel message ${m.handled ? "muted" : ""}`}>
            <div className="row spaced">
              <div>
                <span className={`status ${m.handled ? "on" : "off"}`}>
                  {m.handled ? "Traité" : "À traiter"}
                </span>{" "}
                <strong>{m.subject}</strong>
              </div>
              <span className="hint">{new Date(m.createdAt).toLocaleString("fr-FR")}</span>
            </div>
            <p>
              <strong>{m.name}</strong> · {m.email}
            </p>
            <p className="message-body">{m.message}</p>
            <div className="row">
              <a
                className="button small"
                href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject} — SQuizz`)}`}
              >
                <Mail size={16} /> Répondre
              </a>
              <button
                className="button small secondary"
                disabled={busy}
                onClick={() =>
                  run(() => postJson(`/api/admin/messages/${m.id}`, { handled: !m.handled }, "PATCH"))
                }
              >
                {m.handled ? <RotateCcw size={16} /> : <Check size={16} />}{" "}
                {m.handled ? "Rouvrir" : "Marquer traité"}
              </button>
              <button
                className="card-action danger"
                title="Supprimer"
                aria-label={`Supprimer le message de ${m.name}`}
                disabled={busy}
                onClick={() => {
                  if (confirm("Supprimer ce message ?"))
                    run(() => postJson(`/api/admin/messages/${m.id}`, undefined, "DELETE"));
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
