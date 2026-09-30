import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Arboreal Planet",
  description: "Find reptile species, plants, articles, keepers and community content on Arboreal Planet.",
  openGraph: { title: "Search Arboreal Planet | Arboreal Planet", description: "Find reptile species, plants, articles, keepers and community content on Arboreal Planet." },
  twitter: { title: "Search Arboreal Planet | Arboreal Planet", description: "Find reptile species, plants, articles, keepers and community content on Arboreal Planet." },
  robots: { index: false, follow: true },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
