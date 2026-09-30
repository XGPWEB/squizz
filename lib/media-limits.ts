/** Upload limits shared by the editor (checks and messages) and the upload route (enforcement). */
const MB = 1024 * 1024;

export const MEDIA_LIMITS = {
  /** A photo once optimised in the browser (resized and re-encoded). */
  image: 2 * MB,
  /** Animated GIFs are sent as they are: re-encoding would lose the animation. */
  gif: 5 * MB,
  video: 20 * MB,
  /** Largest photo accepted from the device before optimisation. */
  source: 30 * MB,
  /** Longest side of an optimised photo, in pixels: sharp on a projector, light on a phone. */
  maxSide: 1600,
};

export const limitFor = (type: string) =>
  type === "image/gif"
    ? MEDIA_LIMITS.gif
    : type.startsWith("image/")
      ? MEDIA_LIMITS.image
      : MEDIA_LIMITS.video;

export const formatSize = (bytes: number) =>
  bytes >= MB
    ? `${(bytes / MB).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
