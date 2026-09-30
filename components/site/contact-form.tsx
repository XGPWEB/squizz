"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { CONTACT_SUBJECTS } from "@/lib/contact";
import { postJson } from "@/lib/client/api";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileOptions) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export function ContactForm({ siteKey, email }: { siteKey: string; email: string }) {
  const [name, setName] = useState(""),
    [from, setFrom] = useState(""),
    [subject, setSubject] = useState<string>(CONTACT_SUBJECTS[0]),
    [message, setMessage] = useState(""),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState(""),
    [token, setToken] = useState(""),
    [widgetFailed, setWidgetFailed] = useState(false),
    [status, setStatus] = useState<Status>({ kind: "idle" });
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  function renderWidget() {
    if (!siteKey || !window.turnstile || !box.current || widget.current) return;
    setWidgetFailed(false);
    widget.current = window.turnstile.render(box.current, {
      sitekey: siteKey,
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }
  useEffect(() => {
    if (!siteKey) return;
    // An ad blocker can silently stop the script: tell the visitor instead of a dead button.
    const timeout = window.setTimeout(() => {
      if (!widget.current) setWidgetFailed(true);
    }, 8000);
    return () => {
      window.clearTimeout(timeout);
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
    };
  }, [siteKey]);

  // What is still missing, shown in words when the visitor tries to send (never a silently greyed-out button).
  const missing = [
    !name.trim() && "votre nom",
    !/^\S+@\S+\.\S+$/.test(from) && "une adresse email valide",
    message.trim().length < 10 && "un message d’au moins 10 caractères",
    !consent && "votre accord sur le traitement de vos données",
    siteKey && !token && "la vérification anti-robot (quelques secondes)",
  ].filter(Boolean) as string[];
  const [tried, setTried] = useState(false);
  const invalid = (bad: boolean) => (tried && bad ? { "aria-invalid": true as const } : {});

  if (status.kind === "sent")
    return (
      <div className="contact-sent" role="status">
        <p className="eyebrow">— MESSAGE ENVOYÉ —</p>
        <h3>Merci !</h3>
        <p>On revient vers vous rapidement, généralement sous 24 h ouvrées.</p>
      </div>
    );

  return (
    <form
      className="contact-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setTried(true);
        if (missing.length || status.kind === "sending") return;
        setStatus({ kind: "sending" });
        try {
          await postJson("/api/contact", {
            name,
            email: from,
            subject,
            message,
            consent,
            website,
            turnstileToken: token,
          });
          setStatus({ kind: "sent" });
        } catch (err) {
          // A Turnstile token works once: get a fresh one before retrying.
          setToken("");
          if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
          setStatus({ kind: "error", message: (err as Error).message });
        }
      }}
    >
      <p className="eyebrow">— ENVOYER UN MESSAGE —</p>
      <label>
        Nom complet
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jean Dupont"
          {...invalid(!name.trim())}
          required
          maxLength={100}
          autoComplete="name"
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="jean@monorganisation.fr"
          {...invalid(!/^\S+@\S+\.\S+$/.test(from))}
          required
          autoComplete="email"
        />
      </label>
      <label>
        Sujet
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Message (10 caractères minimum)
        <textarea
          {...invalid(message.trim().length < 10)}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre besoin en quelques lignes…"
          required
          maxLength={2000}
        />
      </label>
      <label className="check-line">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          {...invalid(!consent)}
        />
        <span>
          J’accepte que mes données soient traitées dans le cadre de ma demande (
          <Link href="/confidentialite">politique de confidentialité</Link>).
        </span>
      </label>
      {/* Honeypot: off-screen and out of the tab order; a neutral name so browser autofill leaves it empty. */}
      <div aria-hidden="true" className="hp-field">
        <input
          tabIndex={-1}
          autoComplete="off"
          name="sq-hp-7c1"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {siteKey && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
            onReady={renderWidget}
            onError={() => setWidgetFailed(true)}
          />
          <div ref={box} />
          {widgetFailed && !token && (
            <div className="error" role="alert">
              La vérification anti-robot n’a pas pu se charger, ce qui empêche l’envoi. Désactivez votre
              bloqueur de publicités pour ce site puis{" "}
              <button type="button" className="link-button" onClick={() => location.reload()}>
                réessayez
              </button>
              , ou écrivez-nous directement à <a href={`mailto:${email}`}>{email}</a>.
            </div>
          )}
        </>
      )}
      {status.kind === "error" && (
        <div className="error" role="alert">
          {status.message}
        </div>
      )}
      {tried && missing.length > 0 && (
        <div className="error" role="alert">
          Pour envoyer, il manque : {missing.join(", ")}.
        </div>
      )}
      <button className="button" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Envoi…" : "Envoyer le message"} <Send size={18} />
      </button>
    </form>
  );
}
