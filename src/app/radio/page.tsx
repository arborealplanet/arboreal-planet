import { RadioStationClient } from "@/components/RadioStationClient";

export const metadata = {
  title: "Arboreal Radio",
  description: "Lizard music — the Arboreal Planet station. Seventeen tracks of canopy ambience that keep playing while you browse.",
};

export default function RadioPage() {
  return (
    <main className="min-h-dvh bg-[#06100c]">
      <RadioStationClient />
    </main>
  );
}
