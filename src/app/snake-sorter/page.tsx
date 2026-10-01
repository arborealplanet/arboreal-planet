import { redirect } from "next/navigation";
import { SnakeSorterLabShell } from "@/components/SnakeSorterLabShell";
import { SnakeSorterContribute } from "@/components/SnakeSorterContribute";
import { getServerIdentity, getSnakeSorterAccess } from "@/lib/supabase-auth";

export const metadata = {
  title: "Snake Sorter",
  robots: { index: false, follow: false },
};

export default async function SnakeSorterPage() {
  const identity = await getServerIdentity();
  if (!identity) redirect("/snake-sorter/login");

  const access = await getSnakeSorterAccess(identity.token, identity.user.id);
  if (!access.allowed) {
    // Signed in but not granted lab access: supply-only. Contributors can
    // upload media and track their own submissions — the scanner, library
    // and every other dataset surface stay owner-granted.
    return (
      <main className="mx-auto min-h-[100dvh] max-w-[1100px] px-3 py-5 sm:px-5">
        <div className="mb-5">
          <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-200/45">Snake Sorter</div>
          <h1 className="mt-1 text-xl font-semibold text-white/85">Contribute media</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/40">
            Share green tree python photos and videos to improve Snake Sorter. Everything is owner-reviewed before it can enter the reference library. Access to the scanner and library is by owner invitation.
          </p>
        </div>
        <SnakeSorterContribute />
      </main>
    );
  }

  return (
    <SnakeSorterLabShell
      isOwner={access.isOwner}
      accessLevel={access.accessLevel}
    />
  );
}
