import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageIntro } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";
import { getServerIdentity } from "@/lib/supabase-auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const identity = await getServerIdentity();
  const params = await searchParams;
  const raw = params?.next;
  // Only allow same-origin paths — never bounce a signed-in user off-site.
  const next = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile";
  if (identity) redirect(next);
  return <main><PageIntro eyebrow="Account" title="Sign in to Arboreal Planet." description="An account is required for profiles, marketplace listings, community activity and private breeder tools. Public pages remain available without signing in." aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Secure account access</div>} /><section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6"><Suspense><AuthPanel/></Suspense></section></main>
}
