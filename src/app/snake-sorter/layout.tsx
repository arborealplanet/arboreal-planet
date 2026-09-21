import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Snake Sorter",
  description: "Private Green Tree Python visual identification and reference laboratory.",
  manifest: "/snake-sorter/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/api/snake-sorter/app-icon-192", sizes: "192x192", type: "image/png" },
      { url: "/api/snake-sorter/app-icon-512", sizes: "512x512", type: "image/png" },
    ],
    apple: "/api/snake-sorter/app-icon-192",
  },
  appleWebApp: {
    capable: true,
    title: "Snake Sorter",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false },
};

export default function SnakeSorterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-snake-sorter-workspace className="min-h-screen bg-[#020705] text-white">
      {children}
    </div>
  );
}
