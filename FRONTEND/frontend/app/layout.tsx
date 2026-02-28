import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAProvider from "@/lib/PWAProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#040404",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "HEADZ UP Barbershop — Hattiesburg, MS",
    template: "%s | HEADZ UP Barbershop",
  },
  description:
    "Hattiesburg's highest-rated barbershop. Precision cuts, fades, beard trims, and straight razor shaves. Book online with Jarvis or Mr. J.",
  keywords: [
    "barbershop Hattiesburg MS",
    "haircut Hattiesburg",
    "fade haircut",
    "beard trim",
    "book barber online",
    "HEADZ UP barbershop",
    "Hattiesburg barber",
  ],
  authors: [{ name: "HEADZ UP Barbershop" }],
  creator: "HEADZ UP Barbershop",
  metadataBase: new URL("https://headzupbarbershop.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://headzupbarbershop.com",
    siteName: "HEADZ UP Barbershop",
    title: "HEADZ UP Barbershop — Hattiesburg, MS",
    description:
      "Hattiesburg's highest-rated barbershop. Book your cut online.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HEADZ UP Barbershop — Hattiesburg, MS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HEADZ UP Barbershop — Hattiesburg, MS",
    description:
      "Hattiesburg's highest-rated barbershop. Book your cut online.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <PWAProvider />
      </body>
    </html>
  );
}
