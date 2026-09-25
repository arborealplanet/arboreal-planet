import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = { title: "Support" };

export default function SupportPage() {
  return <>
    <PublicInfoPage
      eyebrow="Help & support"
      title="Arboreal Planet Support"
      intro="Use the guidance below to solve common account, pedigree, marketplace and community issues. Arboreal Planet is still growing, so support tools will continue to become more direct as the platform matures."
      actions={[{ label: "Data controls", href: "/data-controls" }, { label: "Account deletion", href: "/account-deletion" }, { label: "Community guidelines", href: "/community-guidelines" }]}
      sections={[
        { title: "Account and sign-in", paragraphs: ["If you are signed out, use the Sign in control in the site header. Pages that require an account should return you to the area you were using after authentication.", "If a profile, avatar or account setting does not update as expected, confirm that you are signed into the intended Arboreal Planet account before changing it again."] },
        { title: "Pedigrees and the Genetics Hub", paragraphs: ["Pedigree records created in the browser can be synced to your Arboreal Planet account. Cloud records remain private unless you explicitly publish an individual animal.", "If an ancestry result includes an unknown percentage, that means part of the recorded parentage is missing or unavailable. Arboreal Planet does not invent ancestry to fill a gap."] },
        { title: "Marketplace", paragraphs: ["Marketplace listings are user-submitted offers. A listing does not automatically prove a completed sale, identity claim, locality claim or pedigree claim.", "Use the platform's reporting controls for suspicious listings or other marketplace content that may violate the Community Guidelines."] },
        { title: "Community and moderation", paragraphs: ["Use report controls on supported posts, comments, profiles and listings when content needs moderator review. Blocking and privacy controls should be used when you do not want direct interaction with another account."] },
        { title: "Arboreal Keeper", paragraphs: ["Arboreal Keeper is a virtual educational game area. Virtual animals, values and progression do not modify real pedigree records or real-world marketplace listings."] },
        { title: "Account or data requests", paragraphs: ["For requests involving account deletion or supported privacy choices, review the Data Controls and Account Deletion pages first. Those pages describe what is currently self-service and what still requires a support request."] },
      ]}
    />
    <div className="mx-auto -mt-10 max-w-5xl px-5 pb-20 sm:px-6">
      <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-5 text-sm leading-7 text-white/45">
        Need to get back into the product? <Link href="/" className="font-bold text-emerald-200/70">Return to Arboreal Planet →</Link>
      </div>
    </div>
  </>;
}
