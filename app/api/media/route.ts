import { prisma } from "@/lib/prisma";
import { HttpError, assertSameOrigin, fail } from "@/lib/server/http";
import { requireMember } from "@/lib/server/guard";
import { storeMedia } from "@/lib/server/media-store";
import { MEDIA_LIMITS, formatSize } from "@/lib/media-limits";
export const dynamic = "force-dynamic";

const MB = 1024 * 1024;
const UPLOADS_PER_HOUR = 60;

export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    assertSameOrigin(req);
    const user = await requireMember();
    if (Number(req.headers.get("content-length")) > MEDIA_LIMITS.video + MB)
      fail(`Fichier trop lourd : ${formatSize(MEDIA_LIMITS.video)} maximum.`, 413);
    const file = (await req.formData()).get("file");
    if (!file || typeof file === "string") fail("Choisissez un fichier image ou vidéo.");
    const recent = await prisma.media.count({
      where: { uploadedById: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= UPLOADS_PER_HOUR) fail("Trop d’imports en peu de temps. Réessayez dans une heure.", 429);
    // Same checks as a quiz import: format, real content, size, organisation quota.
    const url = await storeMedia(user, new Uint8Array(await file.arrayBuffer()), file.type);
    return Response.json(
      {
        media: {
          kind: file.type.startsWith("image/") ? "image" : "video",
          url,
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
