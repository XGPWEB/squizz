"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { CLOUD, layoutCloud, type CloudWord, type PlacedWord } from "@/lib/word-cloud";

const FONT = "Anton, Impact, sans-serif";

/** Makes sure the display font is ready, then measures words with it. */
async function measurer() {
  await document.fonts?.load(`400 100px Anton`).catch(() => null);
  const ctx = document.createElement("canvas").getContext("2d")!;
  return (text: string, size: number) => {
    ctx.font = `400 ${size}px ${FONT}`;
    const m = ctx.measureText(text);
    // The body of the letters, slightly trimmed: accents are left out and the tails of « g, p, q » barely count, so that
    // words sit tight and brush against each other.
    const bare = ctx.measureText(text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
    return {
      width: Math.max(m.width, m.actualBoundingBoxLeft + m.actualBoundingBoxRight),
      ascent: bare.actualBoundingBoxAscent * 0.96,
      descent: m.actualBoundingBoxDescent / 6,
    };
  };
}

const fileName = (title: string) =>
  `nuage-de-mots-${
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "squizz"
  }.png`;

/** Draws the cloud as a 2000 px wide image (question on top, SQuizz signature below) and downloads it. */
async function downloadImage(placed: PlacedWord[], title: string, responses: number) {
  await document.fonts?.load(`400 100px Anton`).catch(() => null);
  const scale = 2;
  const head = 190;
  const foot = 90;
  const canvas = document.createElement("canvas");
  canvas.width = CLOUD.width * scale;
  canvas.height = CLOUD.height * scale + head + foot;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff9ed";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Question, shrunk until it fits on one line.
  ctx.fillStyle = "#141413";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 76;
  do {
    ctx.font = `400 ${size}px ${FONT}`;
    size -= 4;
  } while (ctx.measureText(title).width > canvas.width - 160 && size > 28);
  ctx.fillText(title, canvas.width / 2, head / 2 + 20);
  ctx.textBaseline = "alphabetic";
  for (const w of placed) {
    ctx.font = `400 ${w.size * scale}px ${FONT}`;
    ctx.fillStyle = w.color;
    ctx.fillText(w.label, w.x * scale, head + w.baseline * scale);
  }
  ctx.textBaseline = "middle";
  ctx.font = `700 28px monospace`;
  ctx.fillStyle = "#141413";
  ctx.textAlign = "left";
  ctx.fillText(`${responses} réponse${responses > 1 ? "s" : ""}`, 80, canvas.height - foot / 2 - 10);
  ctx.textAlign = "right";
  ctx.fillText("SQuizz · www.squizz.fun", canvas.width - 80, canvas.height - foot / 2 - 10);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Image impossible à créer.");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName(title);
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * The answers of a word-cloud question: each word's size is proportional to the number of times it was
 * given. The host can download the cloud as an image.
 */
export function WordCloud({
  words,
  title,
  responses,
  canDownload = false,
}: {
  words: CloudWord[];
  title: string;
  responses: number;
  canDownload?: boolean;
}) {
  const [placed, setPlaced] = useState<PlacedWord[] | null>(null);
  const [error, setError] = useState("");
  // Recomputed when the answers change (same words and counts give the same cloud).
  const key = words.map((w) => `${w.label}:${w.count}`).join("|");
  useEffect(() => {
    let active = true;
    measurer().then((measure) => active && setPlaced(layoutCloud(words, measure)));
    return () => {
      active = false;
    };
    // `key` stands for `words`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const top = [...words].sort((a, b) => b.count - a.count).slice(0, 5);

  if (!words.length) return <p className="hint">Aucun mot proposé.</p>;
  return (
    <div className="word-cloud-block">
      {/* Above the cloud: always in view, without scrolling the results window. */}
      {canDownload && placed && placed.length > 0 && (
        <button
          type="button"
          className="button small secondary word-cloud-download"
          onClick={() => downloadImage(placed, title, responses).catch((e: Error) => setError(e.message))}
        >
          <Download size={16} /> Télécharger l’image
        </button>
      )}
      {placed && placed.length ? (
        <svg
          className="word-cloud-svg"
          viewBox={`0 0 ${CLOUD.width} ${CLOUD.height}`}
          role="img"
          aria-label={`Nuage de mots : ${top.map((w) => `${w.label} (${w.count})`).join(", ")}`}
        >
          {placed.map((w) => (
            <text
              key={w.label}
              x={w.x}
              y={w.baseline}
              fontSize={w.size}
              fill={w.color}
              textAnchor="middle"
              fontFamily={FONT}
            >
              {w.label}
              <title>{`${w.label} : cité ${w.count} fois`}</title>
            </text>
          ))}
        </svg>
      ) : (
        // Before the layout is ready, or if the words cannot be laid out: a plain list.
        <div className="word-cloud">
          {words.map((w) => (
            <span key={w.label}>
              {w.label}
              <small> ×{w.count}</small>
            </span>
          ))}
        </div>
      )}
      <p className="word-cloud-top">
        <strong>Les plus cités :</strong>{" "}
        {top.map((w, i) => (
          <span key={w.label}>
            {i > 0 && " · "}
            {w.label} <b>×{w.count}</b>
          </span>
        ))}
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
