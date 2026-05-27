import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navigation/Navbar";
import ServiceWorkerRegistration from "@/components/PWA/ServiceWorkerRegistration";
import CapacitorInit from "@/components/Native/CapacitorInit";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "RideByWeather — Cycling Weather Intelligence",
    template: "%s | RideByWeather",
  },
  description:
    "Real-time cycling weather intelligence. Ride Score, wind-aware routing, and gear recommendations — built for serious cyclists.",
  keywords: ["cycling weather", "ride score", "wind routing", "cycling app", "bike weather"],
  applicationName: "RideByWeather",
  appleWebApp: {
    capable: true,
    title: "RideByWeather",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ridebyweather.com",
    siteName: "RideByWeather",
    title: "RideByWeather — Cycling Weather Intelligence",
    description: "Real-time cycling weather intelligence with Ride Score and wind-aware routing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RideByWeather",
    description: "Cycling weather intelligence platform",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Tag <html> with capacitor-native class BEFORE first paint so the
            navbar can apply status-bar-height padding instantly. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.classList.add('capacitor-native');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-950">
        <ServiceWorkerRegistration />
        <CapacitorInit />
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </body>
    </html>
  );
}
