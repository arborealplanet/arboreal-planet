import { StakesClient } from "@/components/poker/StakesClient";

export const metadata = {
  title: "Hatchling Stakes",
  description: "Wager a home-bred hatchling against the house in a five-hand blackjack score attack.",
};

export default function StakesPage() {
  return (
    <main className="min-h-dvh bg-[#04120a]">
      <StakesClient />
    </main>
  );
}
