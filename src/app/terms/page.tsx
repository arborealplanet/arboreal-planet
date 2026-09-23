import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <PublicInfoPage
    eyebrow="Terms"
    title="Terms of Use"
    intro="These terms describe the basic rules for using Arboreal Planet. They are written to match the platform as it exists today rather than promising features that are not active yet."
    actions={[{ label: "Community guidelines", href: "/community-guidelines" }, { label: "Privacy policy", href: "/privacy" }]}
    sections={[
      { title: "Use the platform responsibly", paragraphs: ["Do not use Arboreal Planet to impersonate another person, intentionally misrepresent an animal as somebody else's, interfere with the service, harass other users, or knowingly publish fraudulent listings or pedigree claims.", "Users remain responsible for the content they choose to publish and for complying with laws that apply to their own activities."] },
      { title: "Marketplace listings", paragraphs: ["The Marketplace currently helps keepers publish and discover listings. Unless a specific transaction feature says otherwise, Arboreal Planet is not the buyer, seller, shipper, payment processor or guarantor of a private transaction between users.", "Seller verification and pedigree links add context but are not a guarantee that a transaction will be successful or that every statement in a listing has been independently verified."] },
      { title: "Pedigrees, locality labels and breeder confirmation", paragraphs: ["Pedigree records can contain keeper-reported information. Breeder confirmation means the identified Arboreal Planet account confirmed a producer relationship to that animal; it does not independently prove geographic locality.", "The registry is intentionally flexible enough to represent sales, transfers, breeding loans, partnerships and co-production. Ownership, parentage, producer credit and pairing participation are separate concepts."] },
      { title: "Husbandry and reference information", paragraphs: ["Arboreal Planet can provide educational husbandry and species information, but keepers are responsible for evaluating conditions for their own animals and seeking qualified professional help when a situation requires it."] },
      { title: "The Hatchery", paragraphs: ["The Hatchery is a game environment. Virtual animal rarity, virtual prices, genetics abstractions, achievements and progression do not establish biological rarity or real-world market value."] },
      { title: "Moderation", paragraphs: ["Arboreal Planet may hide, remove or restrict content or accounts when necessary to protect the platform, respond to reports, enforce community rules, address fraud or comply with legal obligations. Reports do not automatically prove that the reported content is wrong."] },
      { title: "Service changes", paragraphs: ["Features can change as Arboreal Planet develops. The platform may modify or discontinue unfinished or experimental features, but should avoid silently changing the meaning of permanent animal registry records or public trust labels."] },
    ]}
  />;
}
