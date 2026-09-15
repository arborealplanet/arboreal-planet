import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "@/components/PublicInfoPage";
import { AccountDeletionRequestPanel } from "@/components/AccountDeletionRequestPanel";

export const metadata: Metadata = { title: "Account Deletion" };

export default function AccountDeletionPage() {
  return <>
    <PublicInfoPage
      eyebrow="Account controls"
      title="Account Deletion"
      intro="Deleting an Arboreal Planet account is different from making a profile private, removing a post or unpublishing a pedigree animal. Signed-in users can submit a deletion request here, review its status and cancel it while it is still pending."
      actions={[{ label: "Data controls", href: "/data-controls" }, { label: "Privacy policy", href: "/privacy" }, { label: "Support", href: "/support" }]}
      sections={[
        { title: "Current process", paragraphs: ["Account deletion begins with a signed-in deletion request. Submitting the request does not instantly erase the account; it creates a pending request that can be reviewed so public content, linked lineage records and account ownership can be handled correctly.", "You can cancel a request while it is still pending. Arboreal Planet should verify that the request belongs to the account holder before an account is removed or disabled."] },
        { title: "Before requesting deletion", paragraphs: ["Export any pedigree backup you want to keep. Review public posts, comments, listings and pedigree animals you intentionally published. If you only want something hidden rather than the entire account removed, use the relevant privacy or deletion control for that item first."] },
        { title: "Pedigree and registry records", paragraphs: ["A permanent animal registry record can have lineage value beyond a current keeper's account. Account deletion should not silently rewrite historical parentage or producer relationships for other public animals.", "Where a public registry record must remain to preserve lineage integrity, the platform should remove or anonymize account attribution that no longer needs to be public while retaining the minimum animal relationship data required for the pedigree."] },
        { title: "Community and marketplace content", paragraphs: ["Content you created may need to be removed, anonymized or retained in limited form depending on the type of record and its relationship to other users. Moderation records may also be retained when reasonably necessary for platform safety and abuse prevention."] },
        { title: "The Hatchery and private records", paragraphs: ["Virtual Hatchery progress and private keeper records associated only with the deleted account should not be treated as public biological records. The deletion workflow should remove or detach those records according to the product's current data model."] },
        { title: "Request status", paragraphs: ["The request panel below shows the latest request associated with the signed-in account. Pending requests can be cancelled from the same panel. A completed status means the request has finished processing; it does not mean unrelated public records were silently rewritten."] },
      ]}
    />
    <AccountDeletionRequestPanel />
    <div className="mx-auto max-w-5xl px-5 pb-20 sm:px-6">
      <div className="panel rounded-2xl p-5 text-sm leading-7 text-white/45">
        Want to keep the account but reduce what is visible? <Link href="/data-controls" className="font-bold text-emerald-200/70">Review Data Controls →</Link>
      </div>
    </div>
  </>;
}
