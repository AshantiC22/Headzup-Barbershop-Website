/** @type {import('next').NextConfig} */

// Files in /public aren't fingerprinted, so they can't be cached as immutable:
// a new gallery photo or icon has to reach people without a filename change.
// A week, then revalidate in the background.
const PUBLIC_ASSET_CACHE = "public, max-age=604800, stale-while-revalidate=86400";

module.exports = {
  poweredByHeader: false,

  async redirects() {
    return [
      { source: "/home", destination: "/", permanent: true },
      // The shop-wide calendar was folded into the overview.
      { source: "/admin-schedule", destination: "/admin-stats", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/site.webmanifest",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript" },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
      {
        source: "/:path*\\.(jpg|jpeg|png|webp|avif|svg|ico)",
        headers: [{ key: "Cache-Control", value: PUBLIC_ASSET_CACHE }],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
