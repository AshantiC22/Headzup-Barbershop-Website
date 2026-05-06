import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAProvider from "@/lib/PWAProvider";
import ClientProviders from "@/components/ClientProviders";


const SITE_URL  = "https://headzupp.com";
const SITE_NAME = "HEADZ UP Barbershop";
const DESCRIPTION =
  "Hattiesburg's premier barbershop. Precision fades, clean lineups, and beard trims by expert barbers. Book your appointment online — available 24/7.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#040404",
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
    "lineup", "beard trim", "book barber online", "HEADZ UP", "W 4th St",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  // ── Open Graph (Facebook, Instagram link previews) ──
  openGraph: {
    type:        "website",
    locale:      "en_US",
    url:         SITE_URL,
    siteName:    SITE_NAME,
    title:       `${SITE_NAME} — Hattiesburg, MS`,
    description: DESCRIPTION,
    images: [
      {
        url:    `${SITE_URL}/og-image.jpg`,
        width:  1200,
        height: 630,
        alt:    `${SITE_NAME} — Precision Cuts in Hattiesburg MS`,
      },
    ],
  },

  // ── Twitter / X Card ──
  twitter: {
    card:        "summary_large_image",
    title:       `${SITE_NAME} — Hattiesburg, MS`,
    description: DESCRIPTION,
    images:      [`${SITE_URL}/og-image.jpg`],
  },

  // ── PWA + Icons ──
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "black-translucent",
    title:           "HEADZ UP",
    startupImage:    [{ url: "/apple-touch-icon.png" }],
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },

  // ── Additional meta ──
  other: {
    "mobile-web-app-capable":            "yes",
    "apple-mobile-web-app-capable":      "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection":                  "telephone=no",
    "geo.region":                        "US-MS",
    "geo.placename":                     "Hattiesburg",
    "geo.position":                      "31.3271;-89.2903",
    "ICBM":                              "31.3271, -89.2903",
  },

  // ── Robots ──
  robots: {
    index:           true,
    follow:          true,
    googleBot: {
      index:         true,
      follow:        true,
      "max-image-preview": "large",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preconnect to Railway API so first request is instant */}
        <link rel="preconnect" href="https://api.headzupp.com" />
        <link rel="dns-prefetch" href="https://api.headzupp.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HEADZ UP" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#040404" />
        {/* Local business structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context":       "https://schema.org",
              "@type":          "HairSalon",
              "name":           "HEADZ UP Barbershop",
              "description":    DESCRIPTION,
              "url":            SITE_URL,
              "telephone":      "",
              "address": {
                "@type":          "PostalAddress",
                "streetAddress":  "2509 W 4th St",
                "addressLocality":"Hattiesburg",
                "addressRegion":  "MS",
                "postalCode":     "39401",
                "addressCountry": "US",
              },
              "geo": {
                "@type":     "GeoCoordinates",
                "latitude":  31.3271,
                "longitude": -89.2903,
              },
              "openingHoursSpecification": [
                { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "09:00", "closes": "18:00" },
                { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday"], "opens": "09:00", "closes": "16:00" },
              ],
              "priceRange": "$$",
              "image": `${SITE_URL}/og-image.jpg`,
            }),
          }}
        />
      </head>
      <body>
        <PWAProvider><ClientProviders>{children}</ClientProviders></PWAProvider>
      </body>
    </html>
  );
}
