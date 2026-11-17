import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";
import { HOURS, SHOP } from "@/lib/shop";

// Fonts are preloaded and get a metric-matched fallback, so headlines don't
// jump when the real face arrives. Files and their license are in app/fonts.
//   Anybody: one variable family with a width axis, from 50% condensed to 150%
//   wide. The wordmark fades through both axes letter by letter.
//   Atkinson Hyperlegible Next: drawn for readers with low vision; the shop
//   cuts kids and seniors, so the reading text has to work for both.
const display = localFont({
  src: "./fonts/anybody-latin-wdth-normal.woff2",
  weight: "100 900",
  variable: "--ff-display",
  adjustFontFallback: "Arial",
  declarations: [{ prop: "font-stretch", value: "50% 150%" }],
});
const body = localFont({
  src: [
    { path: "./fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/atkinson-hyperlegible-next-latin-wght-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--ff-body",
  adjustFontFallback: "Arial",
});

const SITE_URL = "https://headzupp.com";
const SITE_NAME = "HEADZ UP Barbershop";
const DESCRIPTION =
  "Barbershop on West 4th Street in Hattiesburg, MS. Fades, lineups, beard work and hot-lather shaves. Pick your barber and book online any time.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F2EE" },
    { media: "(prefers-color-scheme: dark)", color: "#121518" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} in Hattiesburg, MS`, template: `%s | ${SITE_NAME}` },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} in Hattiesburg, MS`,
    description: DESCRIPTION,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HEADZ UP Barbershop, 2509 West 4th Street, Hattiesburg",
      },
    ],
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

// Runs before first paint. Day is the default; Night if chosen, or if the
// visitor never chose and their device is set to dark.
const THEME_SCRIPT = `(function(){var r=document.documentElement,t='light';try{var s=localStorage.getItem('headzup_theme');if(s==='dark'||s==='light')t=s;else if(matchMedia('(prefers-color-scheme: dark)').matches)t='dark';}catch(e){}r.setAttribute('data-theme',t);r.style.colorScheme=t;})();`;

// Opening hours for search engines, grouped so days with the same hours share a row.
const openingHours = Object.values(
  HOURS.filter((h) => h.open).reduce<
    Record<string, { "@type": string; dayOfWeek: string[]; opens: string; closes: string }>
  >((rows, h) => {
    const key = `${h.open}-${h.close}`;
    rows[key] ??= { "@type": "OpeningHoursSpecification", dayOfWeek: [], opens: h.open!, closes: h.close! };
    rows[key].dayOfWeek.push(h.label);
    return rows;
  }, {}),
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
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://api.headzupp.com" crossOrigin="anonymous" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS) }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
