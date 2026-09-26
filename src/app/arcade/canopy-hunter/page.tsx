import { CanopyHunter } from "@/components/CanopyHunter";

export const metadata = {
  title: "Canopy Hunter",
  description:
    "A Canopy Hunter mini-game: search the night canopy for green tree pythons and bring your catch home to Arboreal Keeper.",
};

export default function CanopyHunterPage() {
  return (
    <main className="min-h-screen bg-[#04120c]">
      <CanopyHunter />
    </main>
  );
}
