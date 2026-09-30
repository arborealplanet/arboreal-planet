import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reptile Keeper Community",
  description: "Share reptile husbandry notes, breeding updates, photos and questions with fellow keepers on Arboreal Planet.",
  openGraph: { title: "Reptile Keeper Community | Arboreal Planet", description: "Share reptile husbandry notes, breeding updates, photos and questions with fellow keepers on Arboreal Planet." },
  twitter: { title: "Reptile Keeper Community | Arboreal Planet", description: "Share reptile husbandry notes, breeding updates, photos and questions with fellow keepers on Arboreal Planet." },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
