import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Snake Sorter",
  description: "Private Green Tree Python visual identification and reference laboratory.",
  manifest: "/snake-sorter/manifest.webmanifest",
  icons: {
    icon: "/branding/snake-sorter-logo.svg",
    apple: "/branding/snake-sorter-logo.svg",
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
