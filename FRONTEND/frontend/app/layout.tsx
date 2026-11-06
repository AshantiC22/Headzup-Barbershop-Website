import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/figtree";
import "./globals.css";
import PWAProvider from "@/lib/PWAProvider";
import ClientProviders from "@/components/ClientProviders";

const SITE_URL  = "https://headzupp.com";
const SITE_NAME = "HEADZ UP Barbershop";
const DESCRIPTION =
  "Barbershop on West 4th Street in Hattiesburg, MS. Fades, lineups, beard work and hot-lather shaves. Pick your barber and book online any time.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9EEF1" },
    { media: "(prefers-color-scheme: dark)",  color: "#0F1A2E" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Hattiesburg, MS`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "barbershop", "Hattiesburg", "Mississippi", "haircut", "fade",
    "lineup", "beard trim", "hot shave", "book barber online", "HEADZ UP", "W 4th St",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Hattiesburg, MS`,
    description: DESCRIPTION,
    images: [{ url: `${SITE_URL}/og-image.jpg`, width: 1200, height: 630, alt: `${SITE_NAME}, Hattiesburg MS` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Hattiesburg, MS`,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.jpg`],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HEADZ UP",
    startupImage: [{ url: "/apple-touch-icon.png" }],
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "format-detection": "telephone=no",
    "geo.region": "US-MS",
    "geo.placename": "Hattiesburg",
    "geo.position": "31.3271;-89.2903",
    "ICBM": "31.3271, -89.2903",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

// Runs before first paint so the right light is on from the first frame.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('headzup_theme');var d=s?s==='dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: SITE_NAME,
  description: DESCRIPTION,
  url: SITE_URL,
  telephone: "+1-601-206-5206",
  address: {
    "@type": "PostalAddress",
    streetAddress: "2509 W 4th St",
    addressLocality: "Hattiesburg",
    addressRegion: "MS",
    postalCode: "39401",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 31.3271, longitude: -89.2903 },
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "09:00", closes: "16:00" },
  ],
  priceRange: "$$",
  image: `${SITE_URL}/og-image.jpg`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://api.headzupp.com" />
        <link rel="dns-prefetch" href="https://api.headzupp.com" />
        <meta name="apple-mobile-web-app-title" content="HEADZ UP" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS) }}
        />
      </head>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <PWAProvider>
          <ClientProviders>{children}</ClientProviders>
        </PWAProvider>
      </body>
    </html>
  );
}
