import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { planLimits, sizeLabel } from "@/lib/plans";
import { HttpError, assertSameOrigin, fail } from "@/lib/server/http";
import { requireMember } from "@/lib/server/guard";
import { mediaDir, mediaPath } from "@/lib/server/media-store";
import { MEDIA_LIMITS, formatSize, limitFor } from "@/lib/media-limits";
export const dynamic = "force-dynamic";

const MB = 1024 * 1024;
const UPLOADS_PER_HOUR = 60;
const types = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];

/** Checks the file's first bytes so a renamed file cannot pass as another format. */
function matchesSignature(type: string, b: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...b.slice(start, end));
  if (type === "image/jpeg") return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === "image/png") return b[0] === 137 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (type === "video/mp4") return ascii(4, 8) === "ftyp";
  return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
}

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    assertSameOrigin(req);
    const user = await requireMember();
    if (Number(req.headers.get("content-length")) > MEDIA_LIMITS.video + MB)
      fail(`Fichier trop lourd : ${formatSize(MEDIA_LIMITS.video)} maximum.`, 413);
    const file = (await req.formData()).get("file");
    if (!file || typeof file === "string") fail("Choisissez un fichier image ou vidéo.");
    if (!types.includes(file.type) || file.size === 0)
      fail("Formats acceptés : JPG, PNG, WebP, GIF, MP4 ou WebM.");
    // Photos arrive already optimised by the editor; anything heavier did not go through it.
    if (file.size > limitFor(file.type))
      fail(
        `Fichier trop lourd : ${formatSize(limitFor(file.type))} maximum pour ce format. Les photos importées depuis l’éditeur sont optimisées automatiquement.`,
        413,
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesSignature(file.type, bytes.slice(0, 32)))
      fail("Le contenu du fichier ne correspond pas à son format.");

    const usage = await prisma.media.aggregate({
      where: { organizationId: user.organizationId },
      _sum: { size: true },
    });
    const recent = await prisma.media.count({
      where: { uploadedById: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= UPLOADS_PER_HOUR) fail("Trop d’imports en peu de temps. Réessayez dans une heure.", 429);
    const quota = planLimits(user.organization.plan).mediaBytes;
    if ((usage._sum.size ?? 0) + file.size > quota)
      fail(
        `Votre organisation a atteint sa limite de ${sizeLabel(quota)} de médias. Passez à une offre supérieure (page Tarifs) pour en ajouter.`,
        429,
      );

    const id = crypto.randomUUID();
    await mkdir(mediaDir(), { recursive: true });
    await writeFile(mediaPath(id), bytes);
    await prisma.media.create({
      data: {
        id,
        organizationId: user.organizationId,
        uploadedById: user.id,
        mime: file.type,
        size: file.size,
      },
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
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status, headers });
    console.error(e);
    return Response.json(
      { error: "L’import a échoué. Réessayez avec un fichier plus petit." },
      { status: 503, headers },
    );
  }
}
