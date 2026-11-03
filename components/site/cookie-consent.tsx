"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Dialog } from "radix-ui";
import { Cookie, X } from "lucide-react";
import {
  SERVICES,
  consentCookie,
  makeConsent,
  readConsent,
  type Consent,
  type ServiceId,
} from "@/lib/consent";

const CHANGED = "squizz:consent";
const OPEN = "squizz:cookie-preferences";

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
};
// The cookie string is the snapshot: stable between renders, parsed by the callers.
const snapshot = () => document.cookie;

/** The visitor's choice (null until made); `ready` is false during the server render. */
export function useConsent(): { consent: Consent | null; ready: boolean } {
  const cookies = useSyncExternalStore(subscribe, snapshot, () => null);
  return { consent: readConsent(cookies), ready: cookies !== null };
}

export function saveConsent(choice: Parameters<typeof makeConsent>[0]) {
  document.cookie = consentCookie(makeConsent(choice), location.protocol === "https:");
  window.dispatchEvent(new Event(CHANGED));
}

/** Opens the preferences panel from anywhere (footer link, privacy page, video placeholder). */
export const openCookiePreferences = () => window.dispatchEvent(new Event(OPEN));

export function CookieSettingsLink({
  className = "text-button",
  children = "Gérer les cookies",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" className={className} onClick={openCookiePreferences}>
      {children}
    </button>
  );
}

/** Pages where a banner would get in the way of a live game: consent is asked on the video itself there. */
const inGame = (path: string) =>
  ["/jouer", "/partie", "/solo/", "/telecommande/"].some((prefix) => path.startsWith(prefix));

/**
 * Information banner on the first visit (accept, refuse and customise with the same prominence, no
 * browsing blocked) and the preferences panel. Nothing optional loads before a choice is made.
 */
export function CookieConsent() {
  const { consent, ready } = useConsent();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<ServiceId, boolean> | null>(null);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, []);
  const choices = draft ?? consent?.services ?? makeConsent("none").services;
  const close = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) setDraft(null);
  };
  const choose = (choice: Parameters<typeof makeConsent>[0]) => {
    saveConsent(choice);
    close(false);
  };

  return (
    <>
      {ready && !consent && !open && !inGame(pathname) && (
        <section className="cookie-banner" role="region" aria-label="Cookies">
          <div>
            <p className="cookie-banner-title">
              <Cookie size={20} aria-hidden /> Cookies : à vous de choisir
            </p>
            <p>
              SQuizz ne fait aucune publicité. Deux services demandent votre accord : la{" "}
              <strong>mesure d’audience</strong> des pages publiques (Google Analytics) et les{" "}
              <strong>vidéos YouTube</strong> insérées dans certains quiz.{" "}
              <Link href="/confidentialite#cookies">En savoir plus</Link>
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button className="button small secondary" onClick={() => choose("none")}>
              Tout refuser
            </button>
            <button className="button small secondary" onClick={() => setOpen(true)}>
              Personnaliser
            </button>
            <button className="button small secondary" onClick={() => choose("all")}>
              Tout accepter
            </button>
          </div>
        </section>
      )}
      <Dialog.Root open={open} onOpenChange={close}>
        <Dialog.Portal>
          <Dialog.Overlay className="host-overlay" />
          <Dialog.Content className="host-modal cookie-modal">
            <div className="host-modal-head">
              <div>
                <span className="eyebrow">VOS CHOIX</span>
                <Dialog.Title className="host-modal-title">Gérer les cookies</Dialog.Title>
              </div>
              <Dialog.Close className="host-modal-close" aria-label="Fermer">
                <X size={22} />
              </Dialog.Close>
            </div>
            <div className="host-modal-body">
              <Dialog.Description>
                Vous pouvez changer d’avis à tout moment depuis « Gérer les cookies », en bas de page. Votre
                choix est conservé 6 mois sur cet appareil.
              </Dialog.Description>
              <div className="cookie-service">
                <div>
                  <h3>Cookies nécessaires</h3>
                  <p>
                    Connexion à votre espace, sécurité des formulaires, place du joueur dans une partie,
                    mémorisation de ce choix. Sans eux, le site ne fonctionne pas.
                  </p>
                </div>
                <span className="cookie-always">Toujours actifs</span>
              </div>
              {SERVICES.map((s) => (
                <label className="cookie-service" key={s.id}>
                  <div>
                    <h3>{s.label}</h3>
                    <p>
                      {s.purpose} <small>Fourni par {s.provider}</small>
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label={`Autoriser : ${s.label}`}
                    checked={choices[s.id]}
                    onChange={(e) => setDraft({ ...choices, [s.id]: e.target.checked })}
                  />
                </label>
              ))}
              <p className="hint">
                L’anti-robot du formulaire de contact (Cloudflare Turnstile) ne se charge que si vous utilisez
                ce formulaire. Détail des cookies :{" "}
                <Link href="/confidentialite#cookies">politique de confidentialité</Link>.
              </p>
              <div className="cookie-modal-actions">
                <button className="button secondary" onClick={() => choose("none")}>
                  Tout refuser
                </button>
                <button className="button secondary" onClick={() => choose("all")}>
                  Tout accepter
                </button>
                <button className="button" onClick={() => choose(choices)}>
                  Enregistrer mes choix
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
