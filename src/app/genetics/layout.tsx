import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Green Tree Python Genetics & Pedigrees",
  description: "Explore Green Tree Python locality, subspecies ancestry, genetics education and public pedigree records.",
  openGraph: { title: "Green Tree Python Genetics & Pedigrees | Arboreal Planet", description: "Explore Green Tree Python locality, subspecies ancestry, genetics education and public pedigree records." },
  twitter: { title: "Green Tree Python Genetics & Pedigrees | Arboreal Planet", description: "Explore Green Tree Python locality, subspecies ancestry, genetics education and public pedigree records." },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
