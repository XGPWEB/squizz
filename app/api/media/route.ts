import { env } from "cloudflare:workers";
import { identity, identityHeaders } from "@/lib/identity";
export async function POST(req: Request) {
  const who = identity(req);
  const headers = identityHeaders(req, who);
  try {
    if (!env.BUCKET)
      return Response.json(
        { error: "Le stockage des médias est momentanément indisponible." },
        { status: 503, headers },
      );
    if (Number(req.headers.get("content-length")) > 21 * 1024 * 1024)
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
    const id = crypto.randomUUID();
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
