import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { AuthHashBridge } from "@/components/AuthHashBridge";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const description = "A keeper-first reptile platform for animal and plant reference data, Green Tree Python genetics and pedigrees, community, marketplace tools and the Arboreal Keeper arcade.";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://arboreal-planet.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Arboreal Planet", template: "%s · Arboreal Planet" },
  description,
  manifest: "/manifest.webmanifest",
  applicationName: "Arboreal Planet",
  openGraph: {
    title: "Arboreal Planet",
    description,
    siteName: "Arboreal Planet",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Arboreal Planet — keeper-first reptile community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arboreal Planet",
    description,
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "Arboreal Planet",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#06100c",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host")?.split(":")[0].toLowerCase() ?? "";
  const standaloneSnakeSorter = host === "snake-sorter.vercel.app" || host.startsWith("snake-sorter-");

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        {standaloneSnakeSorter ? children : <><AuthHashBridge /><AppShell>{children}</AppShell></>}
      </body>
    </html>
  );
}
