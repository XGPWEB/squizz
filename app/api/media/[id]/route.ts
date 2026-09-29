import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { isMediaId, mediaPath } from "@/lib/server/media-store";

/** Public by unguessable id: players need to see a quiz's images without an account. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isMediaId(id)) return new Response("Introuvable", { status: 404 });
  const media = await prisma.media.findUnique({ where: { id } });
  const info = media && (await stat(mediaPath(id)).catch(() => null));
  if (!media || !info) return new Response("Introuvable", { status: 404 });
  const headers = new Headers({
    "Content-Type": media.mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });
  // Videos seek with range requests.
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size)
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
    const body = Readable.toWeb(createReadStream(mediaPath(id), { start, end })) as ReadableStream;
    return new Response(body, { status: 206, headers });
  }
  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(mediaPath(id))) as ReadableStream, { headers });
}
