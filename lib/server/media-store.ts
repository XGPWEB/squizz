import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { orgLimits, sizeLabel } from "@/lib/plans";
import { formatSize, limitFor } from "@/lib/media-limits";
import { withOrgLock } from "./org-lock";
import { fail } from "./http";
import type { SessionUser } from "./guard";

/** Uploaded files live outside the code so deployments never erase them. */
// The ignore comment stops the build from tracing (and shipping) the whole project through this dynamic path.
export const mediaDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR || ".media");
export const mediaPath = (id: string) => path.join(/*turbopackIgnore: true*/ mediaDir(), id);
export const isMediaId = (id: string) => /^[a-f0-9-]{36}$/.test(id);

export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];

/** Checks the file's first bytes so a renamed file cannot pass as another format. */
export function matchesSignature(type: string, b: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...b.slice(start, end));
  if (type === "image/jpeg") return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === "image/png") return b[0] === 137 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(ascii(0, 6));
  if (type === "video/mp4") return ascii(4, 8) === "ftyp";
  if (type === "video/webm") return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return false;
}

type Member = SessionUser & { organizationId: string; organization: Parameters<typeof orgLimits>[0] };

/** Format, size and real content of a file, without storing anything: throws the French reason. */
export function checkMedia(bytes: Uint8Array, type: string) {
  if (!MEDIA_TYPES.includes(type) || bytes.length === 0)
    fail("Formats acceptés : JPG, PNG, WebP, GIF, MP4 ou WebM.");
  if (bytes.length > limitFor(type))
    fail(`Fichier trop lourd : ${formatSize(limitFor(type))} maximum pour ce format.`, 413);
  if (!matchesSignature(type, bytes.slice(0, 32)))
    fail("Le contenu du fichier ne correspond pas à son format.");
}

/** Removes stored media (rows and files) by their URL: used to undo an import that did not go through. */
export async function removeMedia(organizationId: string, urls: string[]) {
  const ids = urls.map((u) => u.slice("/api/media/".length)).filter(isMediaId);
  if (!ids.length) return;
  await prisma.media.deleteMany({ where: { organizationId, id: { in: ids } } });
  await Promise.all(ids.map((id) => rm(mediaPath(id), { force: true })));
}

/**
 * Checks a file (format, real content, size) and stores it for the organisation within its media quota:
 * the quota check and the record happen under the organisation lock. Returns the URL used in questions.
 */
export async function storeMedia(user: Member, bytes: Uint8Array, type: string) {
  checkMedia(bytes, type);
  const quota = orgLimits(user.organization).mediaBytes;
  const id = crypto.randomUUID();
  await withOrgLock(user.organizationId, async (tx) => {
    const usage = await tx.media.aggregate({
      where: { organizationId: user.organizationId },
      _sum: { size: true },
    });
    if ((usage._sum.size ?? 0) + bytes.length > quota)
      fail(
        `Votre organisation a atteint sa limite de ${sizeLabel(quota)} de médias. Passez à une offre supérieure (page Tarifs) pour en ajouter.`,
        429,
      );
    await tx.media.create({
      data: {
        id,
        organizationId: user.organizationId,
        uploadedById: user.id,
        mime: type,
        size: bytes.length,
      },
    });
  });
  try {
    await mkdir(mediaDir(), { recursive: true });
    await writeFile(mediaPath(id), bytes);
  } catch (err) {
    await prisma.media.delete({ where: { id } });
    throw err;
  }
  return `/api/media/${id}`;
}
