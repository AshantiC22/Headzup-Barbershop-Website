const SITE_URL = "https://headzupp.com";

const PAGES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/book", changeFrequency: "monthly", priority: 0.9 },
  { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
  { path: "/newsletter", changeFrequency: "weekly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/sms-optin", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap() {
  return PAGES.map(({ path, ...rest }) => ({ url: `${SITE_URL}${path}`, ...rest }));
}
