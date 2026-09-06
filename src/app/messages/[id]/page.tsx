import Link from "next/link";
import { redirect } from "next/navigation";
import { ConversationView } from "@/components/ConversationView";
import { getServerIdentity } from "@/lib/supabase-auth";
export default async function ConversationPage({params}:{params:Promise<{id:string}>}){const identity=await getServerIdentity();if(!identity)redirect("/login?next=/messages");const {id}=await params;return <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6"><Link href="/messages" className="text-xs font-bold text-emerald-200/70">← Inbox</Link><div className="mt-5"><ConversationView id={id}/></div></main>}
