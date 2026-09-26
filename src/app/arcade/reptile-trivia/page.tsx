import { ReptileTrivia } from "@/components/ReptileTrivia";

export const metadata = {
  title: "Reptile Trivia",
  description:
    "A Reptile Trivia mini-game: ten questions on green tree pythons, snake biology, husbandry, and Arboreal Planet lore.",
};

export default function ReptileTriviaPage() {
  return (
    <main className="min-h-screen bg-[#04120c]">
      <ReptileTrivia />
    </main>
  );
}
