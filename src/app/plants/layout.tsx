import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carnivorous & Vivarium Plant Database",
  description: "Explore Nepenthes, carnivorous plants and tropical vivarium foliage with cultivation-focused reference records.",
  openGraph: { title: "Carnivorous & Vivarium Plant Database | Arboreal Planet", description: "Explore Nepenthes, carnivorous plants and tropical vivarium foliage with cultivation-focused reference records." },
  twitter: { title: "Carnivorous & Vivarium Plant Database | Arboreal Planet", description: "Explore Nepenthes, carnivorous plants and tropical vivarium foliage with cultivation-focused reference records." },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
