import "server-only";
import path from "node:path";

/** Uploaded files live outside the code so deployments never erase them. */
// The ignore comment stops the build from tracing (and shipping) the whole project through this dynamic path.
export const mediaDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR || ".media");
export const mediaPath = (id: string) => path.join(/*turbopackIgnore: true*/ mediaDir(), id);
export const isMediaId = (id: string) => /^[a-f0-9-]{36}$/.test(id);
