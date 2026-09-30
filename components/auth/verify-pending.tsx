"use client";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { postJson } from "@/lib/client/api";

/** « Check your inbox » after signup or a refused sign-in, with a limited « send the link again ». */
export function VerifyPending({ email, next, devLink }: { email: string; next?: string; devLink?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle"),
    [message, setMessage] = useState(""),
    [link, setLink] = useState(devLink);
  async function resend() {
    setState("sending");
    try {
      const out = await postJson<{ devLink?: string }>("/api/account/verify/resend", { email, suite: next });
      if (out.devLink) setLink(out.devLink);
      setState("sent");
    } catch (e) {
      setMessage((e as Error).message);
      setState("error");
    }
  }
  return (
    <div className="verify-pending" role="status">
      <MailCheck size={34} aria-hidden />
      <h2>Vérifiez votre boîte mail</h2>
      <p>
        Nous avons envoyé un lien de confirmation à <strong>{email}</strong>. Cliquez dessus pour activer
        votre espace : il est valable 24 heures.
      </p>
      <p className="hint">Rien reçu ? Regardez dans les indésirables, ou demandez un nouveau lien.</p>
      <button
        className="button secondary"
        onClick={resend}
        disabled={state === "sending" || state === "sent"}
      >
        {state === "sent" ? "Nouveau lien envoyé" : state === "sending" ? "Envoi…" : "Renvoyer le lien"}
      </button>
      {state === "error" && <p className="error">{message}</p>}
      {link && (
        <p className="info-box">
          Développement (aucun e-mail envoyé) : <a href={link}>ouvrir le lien de confirmation</a>
        </p>
      )}
    </div>
  );
}
