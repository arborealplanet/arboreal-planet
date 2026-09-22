import type { Metadata, Viewport } from "next";

const description = "Private Green Tree Python visual identification and reference laboratory.";

export const metadata: Metadata = {
  title: { absolute: "Snake Sorter", template: "%s", default: "Snake Sorter" },
  applicationName: "Snake Sorter",
  description,
  manifest: "/snake-sorter/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/api/snake-sorter/app-icon-192", sizes: "192x192", type: "image/webp" },
      { url: "/branding/snake-sorter-app-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/branding/snake-sorter-app-icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "Snake Sorter",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Snake Sorter",
    description,
    siteName: "Snake Sorter",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Snake Sorter",
    description,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#020705",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function SnakeSorterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-snake-sorter-workspace className="min-h-screen bg-[#020705] text-white">
      {children}
    </div>
  );
}
