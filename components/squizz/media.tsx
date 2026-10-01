"use client";
import { MEDIA_LIMITS, formatSize, limitFor } from "@/lib/media-limits";
import { compressImage } from "@/lib/client/compress-image";
import { useState, type KeyboardEvent } from "react";
import { ExternalLink, Play, Upload, X } from "lucide-react";
import { saveConsent, useConsent } from "@/components/site/cookie-consent";
import { youtubeId, safeMediaUrl, type Media } from "@/lib/question";
import { Choice } from "./settings";
export function MediaView({ media }: { media: Media[] }) {
  return (
    <div className="question-media">
      {media.map((m, i) => {
        if (!safeMediaUrl(m.url)) return null;
        const id = m.kind === "youtube" ? youtubeId(m.url) : null;
        return (
          <figure key={`${i}-${m.url}`}>
            {m.kind === "image" ? (
              <img src={m.url} alt={m.caption || "Image de la question"} loading="lazy" />
            ) : m.kind === "video" ? (
              <video
                src={m.url}
                controls
                preload="metadata"
                playsInline
                aria-label={m.caption || "Vidéo de la question"}
              />
            ) : id ? (
              <YouTubeVideo id={id} title={m.caption || "Vidéo YouTube"} />
            ) : m.kind === "link" ? (
              <a className="external-resource" href={m.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={18} />
                {m.caption || m.url}
                <span>Ouvrir dans un nouvel onglet</span>
              </a>
            ) : null}
            {m.caption && m.kind !== "link" && <figcaption>{m.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}
/**
 * A YouTube video loads only with the visitor's agreement (it sends their address to Google, which may set
 * its own cookies): once for this video, or for all videos through the cookie preferences.
 */
function YouTubeVideo({ id, title }: { id: string; title: string }) {
  const { consent } = useConsent();
  const [once, setOnce] = useState(false);
  if (consent?.services.youtube || once)
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  return (
    <div className="video-consent" role="group" aria-label={title}>
      <Play size={30} aria-hidden />
      <p>
        <strong>Vidéo YouTube.</strong> En l’affichant, YouTube (Google) reçoit votre adresse IP et peut
        déposer ses cookies.
      </p>
      <div className="row">
        <button type="button" className="button small" onClick={() => setOnce(true)}>
          Lire cette vidéo
        </button>
        <button
          type="button"
          className="button small secondary"
          onClick={() => saveConsent({ ...consent?.services, youtube: true })}
        >
          Toujours autoriser YouTube
        </button>
      </div>
    </div>
  );
}
export function PinImage({
  media,
  value,
  onChange,
  radius,
  points = [],
  disabled = false,
}: {
  media: Media;
  value?: { x: number; y: number };
  onChange?: (point: { x: number; y: number }) => void;
  radius?: number;
  points?: { x: number; y: number }[];
  disabled?: boolean;
}) {
  const place = (x: number, y: number) =>
    onChange?.({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  function key(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled || !onChange) return;
    const current = value ?? { x: 0.5, y: 0.5 };
    const d = e.shiftKey ? 0.01 : 0.05;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      place(
        current.x + (e.key === "ArrowRight" ? d : e.key === "ArrowLeft" ? -d : 0),
        current.y + (e.key === "ArrowDown" ? d : e.key === "ArrowUp" ? -d : 0),
      );
    }
  }
  return (
    <div
      className="pin-image"
      role={onChange ? "button" : undefined}
      tabIndex={onChange && !disabled ? 0 : undefined}
      aria-label={
        onChange ? "Placer le repère sur l’image. Utiliser les flèches du clavier pour ajuster." : undefined
      }
      onKeyDown={key}
      onClick={(e) => {
        if (disabled || !onChange) return;
        const r = e.currentTarget.getBoundingClientRect();
        place((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }}
    >
      <img src={media.url} alt={media.caption || "Image pour placer le repère"} draggable={false} />
      {value && radius && (
        <span
          className="target-area"
          style={{
            left: `${(value.x - radius) * 100}%`,
            top: `${(value.y - radius) * 100}%`,
            width: `${radius * 200}%`,
            height: `${radius * 200}%`,
          }}
        />
      )}
      {points.map((p, i) => (
        <span key={i} className="map-dot" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>
          {i + 1}
        </span>
      ))}
      {value && (
        <span className="map-dot mine" style={{ left: `${value.x * 100}%`, top: `${value.y * 100}%` }}>
          +
        </span>
      )}
    </div>
  );
}
export function MediaEditor({
  media,
  onChange,
  onBusy,
  onError,
}: {
  media: Media[];
  onChange: (value: Media[]) => void;
  onBusy: (busy: boolean) => void;
  onError: (error: string) => void;
}) {
  const [uploading, setUploading] = useState(false),
    [saved, setSaved] = useState("");
  async function upload(file: File) {
    setUploading(true);
    setSaved("");
    onBusy(true);
    try {
      const image = file.type.startsWith("image/");
      if (file.size > (image ? MEDIA_LIMITS.source : MEDIA_LIMITS.video))
        throw new Error(
          image
            ? `Photo trop lourde : ${formatSize(MEDIA_LIMITS.source)} maximum.`
            : `Vidéo trop lourde : ${formatSize(MEDIA_LIMITS.video)} maximum. Pensez à YouTube pour les vidéos longues.`,
        );
      const sent = await compressImage(file);
      if (sent.size > limitFor(sent.type))
        throw new Error(
          sent.type === "image/gif"
            ? `GIF trop lourd : ${formatSize(MEDIA_LIMITS.gif)} maximum.`
            : `Fichier trop lourd : ${formatSize(limitFor(sent.type))} maximum.`,
        );
      const form = new FormData();
      form.append("file", sent);
      // Big videos on a slow connection: 2 minutes, then a clear message instead of a spinner forever.
      const r = await fetch("/api/media", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(120_000),
      }).catch(() => {
        throw new Error("L’import n’a pas abouti : connexion lente ou coupée. Réessayez.");
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; media?: Media };
      if (!r.ok || !d.media) throw new Error(d.error ?? "L’import a échoué.");
      onChange([...media, d.media]);
      setSaved(
        sent !== file && file.size > sent.size
          ? `Photo optimisée : ${formatSize(file.size)} → ${formatSize(sent.size)}.`
          : `Fichier importé (${formatSize(sent.size)}).`,
      );
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setUploading(false);
      onBusy(false);
    }
  }
  return (
    <section className="media-editor">
      <h3>Photos, vidéos & liens</h3>
      <p className="hint">
        Photos JPG, PNG ou WebP : optimisées automatiquement ({MEDIA_LIMITS.maxSide} px,{" "}
        {formatSize(MEDIA_LIMITS.image)} maximum). GIF : {formatSize(MEDIA_LIMITS.gif)}. Vidéos MP4 ou WebM :{" "}
        {formatSize(MEDIA_LIMITS.video)}. Jusqu’à 4 médias.
      </p>
      {media.map((m, i) => (
        <div className="media-edit-row" key={i}>
          <div className="row">
            <Choice
              label={`Type du média ${i + 1}`}
              value={m.kind}
              options={[
                ["image", "Photo par lien"],
                ["video", "Vidéo par lien"],
                ["youtube", "YouTube"],
                ["link", "Lien web"],
              ]}
              onChange={(v) =>
                onChange(media.map((x, j) => (j === i ? { ...x, kind: v as Media["kind"] } : x)))
              }
            />
            <button
              type="button"
              className="text-button"
              aria-label={`Retirer le média ${i + 1}`}
              onClick={() => onChange(media.filter((_, j) => j !== i))}
            >
              <X />
            </button>
          </div>
          <label>
            Adresse du média
            <input
              value={m.url}
              onChange={(e) => onChange(media.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              placeholder={m.kind === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://…"}
              required
            />
          </label>
          <label>
            Légende ou texte du lien
            <input
              value={m.caption}
              maxLength={200}
              onChange={(e) =>
                onChange(media.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))
              }
            />
          </label>
          {m.url && <MediaView media={[m]} />}
        </div>
      ))}
      <div className="row">
        <label className={`button secondary small upload-button ${media.length >= 4 ? "disabled" : ""}`}>
          <Upload size={17} />
          {uploading ? "Optimisation et import…" : "Importer une photo ou vidéo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            disabled={uploading || media.length >= 4}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="button secondary small"
          disabled={uploading || media.length >= 4}
          onClick={() => onChange([...media, { kind: "youtube", url: "", caption: "" }])}
        >
          Ajouter un lien
        </button>
      </div>
      {saved && (
        <p className="hint" role="status">
          {saved}
        </p>
      )}
    </section>
  );
}
