/**
 * Shared rules of the .squizz transfer file, used by the export, the import and the library screen.
 *
 * Size: the file is JSON with media in base64 (4 bytes for 3). To stay under the server's upload limit
 * (Nginx: 22 MB) with room for the questions, the media of one quiz may weigh 14 MB at most — the same
 * ceiling on export and import, so that anything exported can be imported back.
 */
export const TRANSFER_REF = "squizz-media:";
export const MAX_TRANSFER_MEDIA_BYTES = 14 * 1024 * 1024;
/** Largest .squizz file the library accepts (14 MB of media in base64, plus the questions). */
export const MAX_TRANSFER_FILE_BYTES = 20 * 1024 * 1024;

/**
 * One reference per distinct media id, in order of first appearance; a repeated id keeps its reference.
 * Synchronous on purpose: references exist before any file is read.
 */
export function assignRefs(mediaIds: string[]) {
  const refs = new Map<string, string>();
  for (const id of mediaIds) if (id && !refs.has(id)) refs.set(id, String(refs.size + 1));
  return refs;
}
