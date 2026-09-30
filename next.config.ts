import type { NextConfig } from "next";

/**
 * What the pages may load: our own code, Cloudflare Turnstile (contact form), YouTube videos in
 * quizzes, and images/videos from https links that quiz authors add. Next.js needs inline scripts.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // The project root, so a package-lock.json higher up in the home folder is never picked up.
  turbopack: { root: import.meta.dirname },
  // Self-contained server for the VPS (see deploy.sh).
  output: "standalone",
  // The isolated test server (scripts/e2e.sh) builds elsewhere, so it can run beside `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
