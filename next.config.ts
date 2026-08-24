import type { NextConfig } from "next";

// Video embeds are restricted server-side to these two hosts (see
// ALLOWED_EMBED_HOSTS in lib/nasa-client.ts) — mirrored here in frame-src so
// the CSP itself enforces the same boundary the app already relies on,
// rather than trusting app code alone to never widen the allowlist.
const EMBED_HOSTS = "https://www.youtube.com https://player.vimeo.com";

// Next dev mode needs 'unsafe-eval' (React's dev-mode stack-remapping) and a
// ws: connect-src (HMR's websocket) — neither is present in a production
// build, so scoping both to dev keeps the shipped CSP as strict as possible.
const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `frame-src 'self' ${EMBED_HOSTS}`,
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
