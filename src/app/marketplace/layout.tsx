import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reptile & Plant Marketplace",
  description: "Browse keeper listings for reptiles, plants, enclosures, feeders and supplies on the Arboreal Planet marketplace.",
  openGraph: { title: "Reptile & Plant Marketplace | Arboreal Planet", description: "Browse keeper listings for reptiles, plants, enclosures, feeders and supplies on the Arboreal Planet marketplace." },
  twitter: { title: "Reptile & Plant Marketplace | Arboreal Planet", description: "Browse keeper listings for reptiles, plants, enclosures, feeders and supplies on the Arboreal Planet marketplace." },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
