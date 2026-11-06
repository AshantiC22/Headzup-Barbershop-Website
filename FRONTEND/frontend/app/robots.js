export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/barber-dashboard", "/admin-stats", "/admin-schedule", "/barber-login"],
    },
    sitemap: "https://headzupp.com/sitemap.xml",
  };
}
