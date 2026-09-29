import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project root, so a package-lock.json higher up in the home folder is never picked up.
  turbopack: { root: import.meta.dirname },
  // Self-contained server for the VPS (see deploy.sh).
  output: "standalone",
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
        ],
      },
    ];
  },
};

export default nextConfig;
