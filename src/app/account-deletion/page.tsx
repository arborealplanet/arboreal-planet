import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "@/components/PublicInfoPage";

export const metadata: Metadata = { title: "Account Deletion" };

export default function AccountDeletionPage() {
  return <>
    <PublicInfoPage
      eyebrow="Account controls"
      title="Account Deletion"
      intro="Deleting an Arboreal Planet account is different from making a profile private, removing a post or unpublishing a pedigree animal. This page explains the current deletion process and what should be reviewed first."
      actions={[{ label: "Data controls", href: "/data-controls" }, { label: "Privacy policy", href: "/privacy" }, { label: "Support", href: "/support" }]}
      sections={[
        { title: "Current process", paragraphs: ["Self-service account deletion is not live yet. Until that control is available, account deletion must be handled as a support request rather than through a button that pretends deletion has completed.", "Arboreal Planet should verify that the request comes from the account holder before an account is removed or disabled."] },
        { title: "Before requesting deletion", paragraphs: ["Export any pedigree backup you want to keep. Review public posts, comments, listings and pedigree animals you intentionally published. If you only want something hidden rather than the entire account removed, use the relevant privacy or deletion control for that item first."] },
        { title: "Pedigree and registry records", paragraphs: ["A permanent animal registry record can have lineage value beyond a current keeper's account. Account deletion should not silently rewrite historical parentage or producer relationships for other public animals.", "Where a public registry record must remain to preserve lineage integrity, the platform should remove or anonymize account attribution that no longer needs to be public while retaining the minimum animal relationship data required for the pedigree."] },
        { title: "Community and marketplace content", paragraphs: ["Content you created may need to be removed, anonymized or retained in limited form depending on the type of record and its relationship to other users. Moderation records may also be retained when reasonably necessary for platform safety and abuse prevention."] },
        { title: "The Hatchery and private records", paragraphs: ["Virtual Hatchery progress and private keeper records associated only with the deleted account should not be treated as public biological records. The deletion workflow should remove or detach those records according to the product's current data model."] },
        { title: "What comes next", paragraphs: ["A direct account-deletion request workflow is being added so a signed-in user can submit and track a deletion request from Arboreal Planet itself. Until that workflow is live, this page will not claim that clicking a control immediately deletes the account."] },
      ]}
    />
    <div className="mx-auto -mt-10 max-w-5xl px-5 pb-20 sm:px-6">
      <div className="panel rounded-2xl p-5 text-sm leading-7 text-white/45">
        Want to keep the account but reduce what is visible? <Link href="/data-controls" className="font-bold text-emerald-200/70">Review Data Controls →</Link>
      </div>
    </div>
  </>;
}
