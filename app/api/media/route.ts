import { env } from "cloudflare:workers";
import { identity, identityHeaders } from "@/lib/identity";
import { rawDb } from "@/db";

const MB = 1024 * 1024;
/** Per-visitor limits so one person cannot fill the bucket. */
const QUOTA_BYTES = 200 * MB;
const UPLOADS_PER_HOUR = 30;

async function quotaError(db: D1Database, owner: string, size: number): Promise<string | null> {
  const usage = await db
    .prepare(
      "SELECT COALESCE(SUM(size),0) AS total, COUNT(CASE WHEN created > ? THEN 1 END) AS recent FROM media WHERE owner = ?",
    )
    .bind(Date.now() - 60 * 60 * 1000, owner)
    .first<{ total: number; recent: number }>();
  if ((usage?.recent ?? 0) >= UPLOADS_PER_HOUR)
    return "Trop d’imports en peu de temps. Réessaie dans une heure.";
  if ((usage?.total ?? 0) + size > QUOTA_BYTES) return "Tu as atteint la limite de 200 Mo de médias.";
  return null;
}
export async function POST(req: Request) {
  const who = identity(req);
  const headers = identityHeaders(req, who);
  try {
    if (!env.BUCKET)
      return Response.json(
        { error: "Le stockage des médias est momentanément indisponible." },
        { status: 503, headers },
      );
    if (Number(req.headers.get("content-length")) > 21 * MB)
      return Response.json({ error: "Fichier trop lourd : 20 Mo maximum." }, { status: 413, headers });
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file))
      return Response.json({ error: "Choisis un fichier image ou vidéo." }, { status: 400, headers });
    const types = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (
      !types.includes(file.type) ||
      file.size === 0 ||
      file.size > (file.type.startsWith("image/") ? 8 : 20) * 1024 * 1024
    )
      return Response.json(
        { error: "Formats : JPG, PNG, WebP, GIF (8 Mo maximum), MP4 ou WebM (20 Mo maximum)." },
        { status: 400, headers },
      );
    const b = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    const ascii = (start: number, end: number) => String.fromCharCode(...b.slice(start, end));
    const valid =
      file.type === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : file.type === "image/png"
          ? b[0] === 137 && ascii(1, 4) === "PNG"
          : file.type === "image/webp"
            ? ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
            : file.type === "image/gif"
              ? ["GIF87a", "GIF89a"].includes(ascii(0, 6))
              : file.type === "video/mp4"
                ? ascii(4, 8) === "ftyp"
                : b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
    if (!valid)
      return Response.json(
        { error: "Le contenu du fichier ne correspond pas à son format." },
        { status: 400, headers },
      );
    const db = rawDb();
    const overQuota = await quotaError(db, who.id, file.size);
    if (overQuota) return Response.json({ error: overQuota }, { status: 429, headers });
    const id = crypto.randomUUID();
    await db
      .prepare("INSERT INTO media (id,owner,size,created) VALUES (?,?,?,?)")
      .bind(id, who.id, file.size, Date.now())
      .run();
    await env.BUCKET.put(id, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { owner: who.id },
    });
    return Response.json(
      {
        media: {
          kind: file.type.startsWith("image/") ? "image" : "video",
          url: `/api/media/${id}`,
          caption: "",
        },
      },
      { headers },
    );
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: "L’import a échoué. Réessaie avec un fichier plus petit." },
      { status: 503, headers },
    );
  }
}
