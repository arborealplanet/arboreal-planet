import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = { title: "Data Controls" };

export default function DataControlsPage() {
  return <PublicInfoPage
    eyebrow="Privacy choices"
    title="Data Controls"
    intro="Arboreal Planet separates public community activity from private keeper records wherever the product supports that distinction. These are the main controls available today."
    actions={[{ label: "Privacy policy", href: "/privacy" }, { label: "Account deletion", href: "/account-deletion" }, { label: "Profile settings", href: "/profile" }]}
    sections={[
      { title: "Profile visibility", paragraphs: ["Supported profile information can be configured through your profile settings. A public profile can be discoverable to other visitors; a private profile should not be treated as public merely because the account exists."] },
      { title: "Pedigree visibility", paragraphs: ["Green Tree Python pedigree records synced to your account are private by default. Publishing is opt-in per animal. Making one animal public does not automatically publish every relative in its family tree.", "You can make a previously published animal private again from the Genetics Hub publishing controls."] },
      { title: "Local browser pedigree data", paragraphs: ["The pedigree builder can keep a browser copy of your tree so it works locally. You can export a JSON backup from the pedigree builder before replacing, clearing or moving that local copy.", "Loading a cloud pedigree onto a device replaces the current local pedigree after confirmation. Available cloud photos are restored as local copies for offline use."] },
      { title: "Photos", paragraphs: ["Removing a pedigree photo locally and syncing the record removes the account copy as well. Deleting a synced pedigree animal also removes its stored pedigree photo rather than intentionally leaving an orphaned file."] },
      { title: "Community and marketplace content", paragraphs: ["Posts, comments and marketplace listings you intentionally publish are public content where the product says they are public. Supported edit, delete, privacy and report controls apply to those areas separately from private keeper records."] },
      { title: "Arboreal Keeper", paragraphs: ["Arboreal Keeper stores virtual game progress separately from real pedigree and market records. Virtual animals are not public biological records and are not evidence about real animals."] },
      { title: "Account deletion", paragraphs: ["Account deletion is a separate process from making a profile private or removing an individual pedigree record. Review the Account Deletion page before requesting deletion so you understand which public content and linked records may need separate handling."] },
    ]}
  />;
}
