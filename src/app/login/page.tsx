import { Suspense } from "react";
import { PageIntro } from "@/components/AppShell";
import { AuthPanel } from "@/components/AuthPanel";

export default function LoginPage(){return <main><PageIntro eyebrow="Account" title="Log in to Arboreal Planet." description="Accounts power profiles, marketplace listings, community activity and private breeder tools. Public browsing remains open." aside={<div className="rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-4 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-emerald-200/65">Supabase Auth</div>} /><section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6"><Suspense><AuthPanel/></Suspense></section></main>}
