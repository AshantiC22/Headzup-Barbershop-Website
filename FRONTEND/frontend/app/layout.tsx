import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/figtree";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { HOURS, SHOP } from "@/lib/shop";

const SITE_URL = "https://headzupp.com";
const SITE_NAME = "HEADZ UP Barbershop";
const DESCRIPTION =
  "Barbershop on West 4th Street in Hattiesburg, MS. Fades, lineups, beard work and hot-lather shaves. Pick your barber and book online any time.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9EEF1" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1A2E" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} in Hattiesburg, MS`, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} in Hattiesburg, MS`,
    description: DESCRIPTION,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "A painted harbor at sunrise with a barber pole standing in the water" }],
  },
  twitter: { card: "summary_large_image" },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "HEADZ UP", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// Runs before first paint so the right light is on from the first frame.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('headzup_theme');var d=s?s==='dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

// Opening hours for search engines, grouped so days with the same hours share a row.
const openingHours = Object.values(
  HOURS.filter((h) => h.open).reduce<Record<string, { "@type": string; dayOfWeek: string[]; opens: string; closes: string }>>(
    (rows, h) => {
      const key = `${h.open}-${h.close}`;
      rows[key] ??= { "@type": "OpeningHoursSpecification", dayOfWeek: [], opens: h.open!, closes: h.close! };
      rows[key].dayOfWeek.push(h.label);
      return rows;
    },
    {},
  ),
);

const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: SITE_NAME,
  description: DESCRIPTION,
  url: SITE_URL,
  telephone: SHOP.phone,
  email: SHOP.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: SHOP.street,
    addressLocality: SHOP.city,
    addressRegion: SHOP.region,
    postalCode: SHOP.zip,
    addressCountry: "US",
  },
  hasMap: SHOP.mapsLink,
  openingHoursSpecification: openingHours,
  priceRange: "$$",
  image: `${SITE_URL}/og-image.jpg`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://api.headzupp.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS) }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
