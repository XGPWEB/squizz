import path from "node:path";

/** Uploaded files live outside the code so deployments never erase them. */
export const mediaDir = () => path.resolve(process.env.MEDIA_DIR || ".media");
export const mediaPath = (id: string) => path.join(mediaDir(), id);
export const isMediaId = (id: string) => /^[a-f0-9-]{36}$/.test(id);
