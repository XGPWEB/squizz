"use client";
import { Dialog } from "radix-ui";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

/**
 * A self-paced link, once made: its address, a QR code to scan and a copy button. `days` offers the
 * choice of how long it stays open (from the library); a replay opens straight away for 7 days.
 */
export function SoloLinkDialog({
  trigger,
  title,
  create,
  days = false,
  className = "",
  style,
}: {
  trigger: React.ReactNode;
  title: string;
  create: (days: number) => Promise<string>;
  days?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false),
    [span, setSpan] = useState(7),
    [link, setLink] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  const make = async () => {
    setBusy(true);
    setError("");
    try {
      const id = await create(span);
      setLink(`${window.location.origin}/solo/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !days && !link) void make();
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={`host-overlay ${className}`} />
        <Dialog.Content
          className={`host-modal solo-modal ${className}`}
          style={style}
          aria-describedby="solo-help"
        >
          <div className="host-modal-head">
            <Dialog.Title className="host-modal-title">{title}</Dialog.Title>
            <Dialog.Close className="host-modal-close" aria-label="Fermer">
              <X size={22} />
            </Dialog.Close>
          </div>
          <div className="host-modal-body solo-modal-body">
            <p id="solo-help">
              Chacun joue seul, à son rythme : chaque question a son chrono et sa correction. Les résultats
              arrivent dans l’onglet Résultats au fur et à mesure.
            </p>
            {days && !link && (
              <div className="solo-days" role="radiogroup" aria-label="Durée du lien">
                {[1, 7, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={span === d}
                    className={span === d ? "on" : ""}
                    onClick={() => setSpan(d)}
                  >
                    {d === 1 ? "24 heures" : `${d} jours`}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="error">{error}</p>}
            {link ? (
              <>
                <div className="qr-sticker">
                  <QRCodeSVG
                    value={link}
                    size={220}
                    level="M"
                    marginSize={3}
                    title="Lien du quiz en autonomie"
                  />
                </div>
                <div className="solo-link-row">
                  <input
                    readOnly
                    value={link}
                    aria-label="Lien du quiz en autonomie"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className="button small"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copié" : "Copier"}
                  </button>
                </div>
              </>
            ) : (
              days && (
                <button type="button" className="button" disabled={busy} onClick={make}>
                  Créer le lien
                </button>
              )
            )}
            {busy && !days && <p className="hint">Préparation du lien…</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
