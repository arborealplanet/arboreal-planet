import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <PublicInfoPage
    eyebrow="Privacy"
    title="Privacy Policy"
    intro="Arboreal Planet is designed around public community features and private keeper records. This page explains the main kinds of information the platform handles and which information can become public."
    actions={[{ label: "Data controls", href: "/data-controls" }, { label: "Account deletion", href: "/account-deletion" }]}
    sections={[
      { title: "Account information", paragraphs: ["When you create an account, Arboreal Planet may store account identifiers and the profile information you choose to provide, such as a username, display name, avatar, banner, bio, location and social links.", "Profile visibility controls determine whether supported profile information is available publicly. Private account records are not meant to be exposed simply because an account exists."] },
      { title: "Community and marketplace content", paragraphs: ["Posts, comments, marketplace listings, public profile information and other content you intentionally publish can be visible to other visitors. Reports, moderation records and private account-management data are handled separately from public content.", "Marketplace listings currently describe offers and seller information. Arboreal Planet does not present a listing as proof of a completed sale unless the platform has reliable evidence for that status."] },
      { title: "Pedigrees and keeper records", paragraphs: ["Green Tree Python pedigree records saved to an account are private by default. A keeper must explicitly publish an individual animal before it enters the public lineage database.", "Public pedigree records can include the animal's Arboreal Planet registry ID, reported locality label, parentage links, public producer credits, public pairing history and other information the keeper chose to publish. Private relatives remain masked until their own records are published."] },
      { title: "Photos and files", paragraphs: ["Profile images, marketplace images and pedigree photos may be stored so they can be displayed in the parts of the platform where you chose to use them. Private pedigree photos are served through access-controlled application routes rather than treated as automatically public files."] },
      { title: "Arboreal Keeper", paragraphs: ["Arboreal Keeper contains virtual game data. Virtual animals, game prices, game rarity and progression records are separate from real pedigree and marketplace records unless a future feature explicitly says otherwise."] },
      { title: "Data choices", paragraphs: ["You can keep supported pedigree records private, change supported profile visibility, remove content you control where the interface provides that option, and request account deletion. See Data Controls for a plain-language summary of these choices."] },
      { title: "Changes", paragraphs: ["Arboreal Planet is still evolving. If the platform begins collecting or using information in a materially different way, this policy should be updated to describe that change before the new use becomes part of the normal product experience."] },
    ]}
  />;
}
