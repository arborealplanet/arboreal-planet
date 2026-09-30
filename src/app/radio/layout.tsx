import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arboreal Planet Radio",
  description: "Listen to Arboreal Planet Radio and explore reptile-focused audio content.",
  openGraph: { title: "Arboreal Planet Radio | Arboreal Planet", description: "Listen to Arboreal Planet Radio and explore reptile-focused audio content." },
  twitter: { title: "Arboreal Planet Radio | Arboreal Planet", description: "Listen to Arboreal Planet Radio and explore reptile-focused audio content." },
};

export default function SectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
