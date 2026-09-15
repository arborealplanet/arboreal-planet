import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function CommunityGuidelinesPage() {
  return <PublicInfoPage
    eyebrow="Community"
    title="Community Guidelines"
    intro="Arboreal Planet should be useful to serious keepers without becoming hostile, deceptive or impossible to moderate. These guidelines apply to community content, profiles, marketplace listings and public lineage records."
    actions={[{ label: "Open Community", href: "/community" }, { label: "Terms", href: "/terms" }]}
    sections={[
      { title: "Be useful to other keepers", paragraphs: ["Disagreement is fine. Personal attacks, targeted harassment, threats, repeated unwanted contact and attempts to drive somebody off the platform are not.", "Critique husbandry, claims, listings or breeding decisions with enough context that another keeper can understand the concern."] },
      { title: "Do not knowingly misrepresent animals or records", paragraphs: ["Do not knowingly claim another keeper's animal as your own, fabricate parentage, falsify producer confirmation, or intentionally publish a misleading sale history.", "Locality and lineage can be uncertain. Use reported labels honestly and leave room for uncertainty rather than presenting guesses as verified facts."] },
      { title: "Marketplace conduct", paragraphs: ["Listings should describe the actual animal or item being offered. Do not use deceptive photos, impersonate another seller, or represent a listing as breeder-confirmed when the corresponding registry record does not carry that confirmation.", "If a deal changes, update or remove the listing rather than leaving knowingly outdated information active."] },
      { title: "Reports are for genuine concerns", paragraphs: ["Use report tools for possible fraud, incorrect pedigree data, duplicate records, harassment, unsafe content or other real moderation concerns. Reports are reviewed; they are not a shortcut for winning disagreements."] },
      { title: "Respect privacy", paragraphs: ["Do not publish somebody else's private contact information, private collection records or private pedigree details without permission. A public parent or producer credit does not make a keeper's entire collection public."] },
      { title: "Keep real records and game records separate", paragraphs: ["The Hatchery is a virtual game. Do not present virtual animals, game prices, game achievements or game rarity as real marketplace or pedigree evidence."] },
      { title: "Moderation outcomes", paragraphs: ["Content can be removed or restricted when it violates these rules or creates a credible safety, fraud or privacy problem. Where practical, Arboreal Planet should preserve legitimate pedigree history even when a user account or public presentation changes."] },
    ]}
  />;
}
