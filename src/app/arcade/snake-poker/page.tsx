import { SnakePokerLobby } from "@/components/poker/SnakePokerLobby";

export const metadata = {
  title: "The Snake-Poker Den",
  description:
    "Serpent Hold'em, Canopy Blackjack and Serpent Draw video poker — plus Hatchling Stakes, where breeders risk home-bred hatchlings.",
};

export default function SnakePokerPage() {
  return (
    <main className="min-h-dvh bg-[#04120a]">
      <SnakePokerLobby />
    </main>
  );
}
