import { MEDIA_LIMITS } from "@/lib/media-limits";

/**
 * Shrinks a photo before upload: at most MEDIA_LIMITS.maxSide pixels on the longest side, re-encoded
 * in WebP (JPEG where WebP is unavailable), lowering the quality until it fits the limit. Drawing
 * onto a canvas also drops the EXIF data, including the GPS position of phone photos.
 * GIFs are returned unchanged (animation). Throws when the photo cannot fit.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Cette image n’a pas pu être lue. Essayez un fichier JPG ou PNG.");
  });
  const scale = Math.min(1, MEDIA_LIMITS.maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    let blob = await encode("image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", quality);
    if (!blob) break;
    if (blob.size <= MEDIA_LIMITS.image) {
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
      return new File([blob], name, { type: blob.type });
    }
  }
  throw new Error("Cette photo reste trop lourde même optimisée. Essayez une image plus petite.");
}
