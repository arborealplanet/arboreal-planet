import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reptile & Amphibian Species Database",
  description: "Explore reptile and amphibian species, habitats and locality information, starting with Arboreal Planet's Green Tree Python reference.",
  openGraph: { title: "Reptile & Amphibian Species Database | Arboreal Planet", description: "Explore reptile and amphibian species, habitats and locality information, starting with Arboreal Planet's Green Tree Python reference." },
  twitter: { title: "Reptile & Amphibian Species Database | Arboreal Planet", description: "Explore reptile and amphibian species, habitats and locality information, starting with Arboreal Planet's Green Tree Python reference." },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
