"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Check, ImagePlus, Trash2, X } from "lucide-react";
import { ACCENT_CHOICES, isHex, readableAccent, type Brand, type Theme } from "@/lib/brand";
import { postJson } from "@/lib/client/api";

const LOGO_MAX = 1024 * 1024;

/** The look of the organisation's games: theme, logo, colour and the SQuizz credit, with a live preview. */
export function AppearanceManager({
  initial,
  organization,
  mayHideCredit,
}: {
  initial: Brand;
  organization: string;
  mayHideCredit: boolean;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState(initial),
    [hex, setHex] = useState(initial.accent),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const patch = (value: Partial<Brand>) => {
    setBrand((b) => ({ ...b, ...value }));
    setSaved(false);
  };
  const shown = readableAccent(isHex(hex) ? hex : brand.accent);
  const adjusted = isHex(hex) && shown !== hex.toUpperCase();

  async function upload(file: File) {
    setError("");
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type))
      return setError("Le logo doit être une image PNG, JPG, WebP ou GIF.");
    if (file.size > LOGO_MAX) return setError("Logo trop lourd : 1 Mo au plus.");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "L’envoi du logo a échoué.");
      patch({ logo: data.media.url });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const { brand: stored } = await postJson<{ brand: Brand }>(
        "/api/org/appearance",
        { ...brand, accent: isHex(hex) ? hex : brand.accent },
        "PATCH",
      );
      setBrand(stored);
      setHex(stored.accent);
      setSaved(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const themes: { id: Theme; title: string; text: string }[] = [
    { id: "squizz", title: "SQuizz coloré", text: "Pour les soirées, les classes, les événements festifs." },
    {
      id: "sober",
      title: "Sobre",
      text: "Pour les entreprises, les administrations, les formations : épuré, à vos couleurs.",
    },
  ];

  return (
    <div className="appearance">
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={() => setError("")} aria-label="Fermer le message">
            <X size={16} />
          </button>
        </div>
      )}
      {saved && (
        <div className="success" role="status">
          <Check size={18} /> Apparence enregistrée : elle s’applique aux prochaines parties.
        </div>
      )}
      <div className="dash-heading">
        <div>
          <p className="eyebrow">VOS PARTIES, À VOS COULEURS</p>
          <h1>Apparence</h1>
          <p className="hint">
            Ce que voient vos participants sur le grand écran et sur leur téléphone. Votre espace, lui, ne
            change pas.
          </p>
        </div>
      </div>
      <div className="appearance-grid">
        <div className="appearance-settings">
          <section className="panel">
            <h2>1. Le style</h2>
            <div className="theme-cards" role="radiogroup" aria-label="Style des parties">
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={brand.theme === t.id}
                  className={`theme-card ${brand.theme === t.id ? "on" : ""}`}
                  onClick={() => patch({ theme: t.id })}
                >
                  <span className={`theme-swatch ${t.id}`} aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>
                    {t.title}
                    {brand.theme === t.id && <Check size={16} aria-hidden />}
                  </strong>
                  <small>{t.text}</small>
                </button>
              ))}
            </div>
          </section>
          <section className={`panel ${brand.theme === "sober" ? "" : "muted-panel"}`}>
            <h2>2. Votre logo et votre couleur</h2>
            {brand.theme !== "sober" && (
              <p className="hint">Le logo et la couleur s’affichent avec le style sobre.</p>
            )}
            <div className="logo-field">
              <div className="logo-drop">
                {brand.logo ? (
                  <img src={brand.logo} alt={`Logo de ${organization}`} />
                ) : (
                  <span>VOTRE LOGO</span>
                )}
              </div>
              <div className="stack-tight">
                <div className="row">
                  <button
                    type="button"
                    className="button small secondary"
                    disabled={busy}
                    onClick={() => picker.current?.click()}
                  >
                    <ImagePlus size={16} /> {brand.logo ? "Changer de logo" : "Envoyer un logo"}
                  </button>
                  {brand.logo && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => patch({ logo: null })}
                      aria-label="Retirer le logo"
                    >
                      <Trash2 size={16} /> Retirer
                    </button>
                  )}
                </div>
                <small className="hint">
                  PNG, JPG ou WebP, fond transparent de préférence, 1 Mo au plus.
                </small>
              </div>
              <input
                ref={picker}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) upload(file);
                }}
              />
            </div>
            <fieldset className="accent-field">
              <legend>Couleur principale</legend>
              <div className="row">
                {ACCENT_CHOICES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`accent-swatch ${shown === c ? "on" : ""}`}
                    style={{ background: c }}
                    aria-label={`Couleur ${c}`}
                    aria-pressed={shown === c}
                    onClick={() => {
                      setHex(c);
                      patch({ accent: c });
                    }}
                  />
                ))}
                <label className="accent-custom">
                  <input
                    type="color"
                    value={isHex(hex) ? hex : brand.accent}
                    aria-label="Choisir une couleur"
                    onChange={(e) => {
                      setHex(e.target.value.toUpperCase());
                      patch({ accent: e.target.value.toUpperCase() });
                    }}
                  />
                  <input
                    className="accent-hex"
                    value={hex}
                    maxLength={7}
                    aria-label="Couleur en code hexadécimal"
                    onChange={(e) => {
                      setHex(e.target.value);
                      if (isHex(e.target.value)) patch({ accent: e.target.value.toUpperCase() });
                    }}
                  />
                </label>
              </div>
              <small className="hint">
                {adjusted
                  ? `Trop claire pour rester lisible sur fond blanc : elle sera affichée en ${shown}.`
                  : "Pour le chrono, les boutons, le code de la partie. Les quatre couleurs des réponses restent fixes."}
              </small>
            </fieldset>
            <label className="credit-field">
              <input
                type="checkbox"
                checked={brand.credit}
                disabled={!mayHideCredit && brand.credit}
                onChange={(e) => patch({ credit: e.target.checked })}
              />
              Afficher « SQuizz » en bas des écrans
              {!mayHideCredit && (
                <small className="hint">
                  {" "}
                  · le masquer est inclus dans les <Link href="/tarifs">offres payantes</Link>
                </small>
              )}
            </label>
          </section>
        </div>
        <aside className="appearance-preview" aria-label="Aperçu">
          <p className="eyebrow">APERÇU DU GRAND ÉCRAN</p>
          <div
            className={`mini-stage theme-${brand.theme}`}
            style={{ "--brand": shown } as React.CSSProperties}
            aria-hidden
          >
            {brand.theme === "sober" ? (
              <>
                <div className="mini-top">
                  {brand.logo ? <img src={brand.logo} alt="" /> : <span className="mini-logo">LOGO</span>}
                  <span className="mini-meta">QUESTION 03 — 12</span>
                  <span className="mini-ring" />
                </div>
                <div className="mini-line">
                  <i />
                </div>
                <strong className="mini-title">Quel indicateur suit la fidélité de nos clients ?</strong>
                <div className="mini-answers">
                  {["Le chiffre d’affaires", "Le score NPS", "Le taux de marge", "Le nombre de devis"].map(
                    (a, i) => (
                      <span key={a} className={`a${i}`}>
                        <b>{String.fromCharCode(65 + i)}</b>
                        {a}
                      </span>
                    ),
                  )}
                </div>
                <div className="mini-foot">
                  <span>18 réponses sur 42</span>
                  {brand.credit && <small>SQUIZZ</small>}
                  <span className="mini-button">Correction →</span>
                </div>
              </>
            ) : (
              <>
                <strong className="mini-title">Quel indicateur suit la fidélité de nos clients ?</strong>
                <div className="mini-answers">
                  {["Le chiffre d’affaires", "Le score NPS", "Le taux de marge", "Le nombre de devis"].map(
                    (a, i) => (
                      <span key={a} className={`a${i}`}>
                        <b>{String.fromCharCode(65 + i)}</b>
                        {a}
                      </span>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
          <p className="hint">
            L’apparence s’applique aux parties lancées après l’enregistrement ; une partie en cours garde
            celle de son lancement.
          </p>
          <button type="button" className="button" disabled={busy} onClick={save}>
            <Check size={18} /> Enregistrer
          </button>
        </aside>
      </div>
    </div>
  );
}
