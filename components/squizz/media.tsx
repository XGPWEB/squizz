"use client";
import { MEDIA_LIMITS, formatSize, limitFor } from "@/lib/media-limits";
import { compressImage } from "@/lib/client/compress-image";
import { useState, type KeyboardEvent } from "react";
import { ExternalLink, Music, Play, Square, Upload, X } from "lucide-react";
import { saveConsent, useConsent } from "@/components/site/cookie-consent";
import {
  guessMediaKind,
  youtubeId,
  youtubeStart,
  safeMediaUrl,
  isSoundtrack,
  type Media,
} from "@/lib/question";
import { Choice } from "./settings";
/**
 * A picture given by its address. When it does not load (the address is a web page, the site refuses to
 * show its pictures elsewhere, or it is not in https), players simply do not see it; the editor says why.
 */
function LinkedImage({ media, editing }: { media: Media; editing: boolean }) {
  const [failedUrl, setFailedUrl] = useState("");
  if (failedUrl !== media.url)
    return (
      <img
        src={media.url}
        alt={media.caption || "Image de la question"}
        loading={editing ? undefined : "lazy"}
        onError={() => setFailedUrl(media.url)}
      />
    );
  if (!editing) return null;
  return (
    <p className="info-box media-problem" role="alert">
      <strong>Cette adresse n’affiche pas d’image.</strong>{" "}
      {media.url.startsWith("http://")
        ? "Elle commence par http:// : seules les adresses en https:// s’affichent. "
        : "Il faut l’adresse de l’image elle-même, pas celle de la page qui la contient : clic droit sur l’image, puis « Copier l’adresse de l’image » (elle finit souvent par .jpg, .png ou .webp). Certains sites refusent aussi que leurs images s’affichent ailleurs. "}
      Le plus sûr : enregistrez l’image et utilisez « Importer une photo ». Pour un simple lien vers une page,
      choisissez le type « Lien web ».
    </p>
  );
}

/**
 * The media of a question. `masked` is the blind test before the reveal: only the extract is kept, played
 * without its picture or caption, which would give the answer away.
 */
export function MediaView({
  media,
  masked = false,
  autoPlay = false,
  editing = false,
}: {
  media: Media[];
  masked?: boolean;
  /** In the editor: a picture that does not load is explained instead of being left out. */
  editing?: boolean;
  autoPlay?: boolean;
}) {
  return (
    <div className="question-media">
      {(masked ? media.filter(isSoundtrack).slice(0, 1) : media).map((m, i) => {
        if (!safeMediaUrl(m.url)) return null;
        const id = m.kind === "youtube" ? youtubeId(m.url) : null;
        if (masked)
          return (
            <figure key={`${i}-${m.url}`}>
              <MysteryExtract media={m} autoPlay={autoPlay} />
            </figure>
          );
        return (
          <figure key={`${i}-${m.url}`}>
            {m.kind === "image" ? (
              <LinkedImage media={m} editing={editing} />
            ) : m.kind === "video" ? (
              <video
                src={m.url}
                controls
                preload="metadata"
                playsInline
                aria-label={m.caption || "Vidéo de la question"}
              />
            ) : m.kind === "audio" ? (
              <audio src={m.url} controls preload="metadata" aria-label={m.caption || "Extrait audio"} />
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
 * The extract of a blind test on the host's screen: an audio file plays as soon as the question appears;
 * a YouTube video plays behind a cover once the host starts it (which is also their agreement to load it).
 */
function MysteryExtract({ media, autoPlay }: { media: Media; autoPlay: boolean }) {
  const { consent } = useConsent();
  const [playing, setPlaying] = useState(false);
  const id = media.kind === "youtube" ? youtubeId(media.url) : null;
  if (media.kind === "audio")
    return (
      <div className="mystery-extract">
        <Music size={34} aria-hidden />
        <strong>Extrait mystère</strong>
        <audio src={media.url} controls autoPlay={autoPlay} preload="auto" aria-label="Extrait à deviner" />
      </div>
    );
  if (!id) return null;
  return (
    <div className={`mystery-extract ${playing ? "playing" : ""}`}>
      <Music size={34} aria-hidden />
      <strong>{playing ? "Extrait en cours…" : "Extrait mystère"}</strong>
      {playing && (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=0&start=${youtubeStart(media.url)}`}
          title="Extrait à deviner"
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          aria-hidden
        />
      )}
      <button type="button" className="button small" onClick={() => setPlaying((p) => !p)}>
        {playing ? <Square size={16} /> : <Play size={16} />}
        {playing ? "Arrêter l’extrait" : "Lancer l’extrait"}
      </button>
      {!playing && !consent?.services.youtube && (
        <p>L’extrait vient de YouTube (Google), qui reçoit votre adresse IP et peut déposer ses cookies.</p>
      )}
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
      if (file.type.startsWith("audio/") && file.size > MEDIA_LIMITS.audio)
        throw new Error(`Fichier audio trop lourd : ${formatSize(MEDIA_LIMITS.audio)} maximum.`);
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
      <h3>Photos, vidéos, sons & liens</h3>
      <p className="hint">
        Photos JPG, PNG ou WebP : optimisées automatiquement ({MEDIA_LIMITS.maxSide} px,{" "}
        {formatSize(MEDIA_LIMITS.image)} maximum). GIF : {formatSize(MEDIA_LIMITS.gif)}. Vidéos MP4 ou WebM :{" "}
        {formatSize(MEDIA_LIMITS.video)}. Sons MP3, M4A ou OGG : {formatSize(MEDIA_LIMITS.audio)}. Jusqu’à 4
        médias.
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
                ["audio", "Son par lien"],
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
              onChange={(e) => {
                // The type follows the address when it tells what it is (YouTube, picture, video, sound).
                const url = e.target.value;
                const kind = guessMediaKind(url) ?? m.kind;
                onChange(media.map((x, j) => (j === i ? { ...x, url, kind } : x)));
              }}
              placeholder="https://… (image, vidéo, son, YouTube ou page web)"
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
          {m.url && <MediaView media={[m]} editing />}
        </div>
      ))}
      <div className="row">
        <label className={`button secondary small upload-button ${media.length >= 4 ? "disabled" : ""}`}>
          <Upload size={17} />
          {uploading ? "Optimisation et import…" : "Importer une photo, une vidéo ou un son"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.m4a,.ogg"
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
          onClick={() => onChange([...media, { kind: "image", url: "", caption: "" }])}
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
