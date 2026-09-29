/** Loopback belongs to each visitor's own device, so never share it with a phone. */
export function invitationOrigin(origin: string, previewHost = ""): string {
  const url = new URL(origin);
  if (previewHost && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    url.hostname = previewHost;
  }
  return url.origin;
}
