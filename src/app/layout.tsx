import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navigation/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "RideByWeather — Cycling Weather Intelligence",
    template: "%s | RideByWeather",
  },
  description:
    "Real-time cycling weather intelligence. Ride Score, wind-aware routing, and gear recommendations — built for serious cyclists.",
  keywords: ["cycling weather", "ride score", "wind routing", "cycling app", "bike weather"],
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </body>
    </html>
  );
}
