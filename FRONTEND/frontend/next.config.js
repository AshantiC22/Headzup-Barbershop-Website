/** @type {import('next').NextConfig} */
const nextConfig = {

  // ── Compression & performance ──────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,

  // ── Image optimization ─────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // 24 hours
    remotePatterns: [
      { protocol:"https", hostname:"api.headzupp.com" },
      { protocol:"https", hostname:"*.stripe.com" },
    ],
  },

  // ── Experimental perf ─────────────────────────────────────────────────────
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["axios"],
  },

  // ── Headers ───────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/site.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type",          value: "application/javascript" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control",         value: "no-cache" },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/:path*\\.(jpg|jpeg|png|gif|webp|avif|svg|ico|woff|woff2|ttf|otf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Cache videos
        source: "/:path*\\.(mp4|webm)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
      {
        // Security headers on all pages
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",         value: "SAMEORIGIN" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
