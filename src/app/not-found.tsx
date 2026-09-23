import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-4xl place-items-center px-5 py-16 text-center sm:px-6">
      <div className="w-full rounded-[30px] border border-white/[.07] bg-[radial-gradient(circle_at_top,rgba(52,211,153,.08),transparent_36%),rgba(255,255,255,.018)] p-8 sm:p-12">
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200/55">404 · Off the branch</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl">That page isn’t here.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/45">
          The link may be old, private, or still under construction. Head back to the hub or search Arboreal Planet.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/" className="primary-action">Back home</Link>
          <Link href="/search" className="secondary-action">Search Arboreal Planet</Link>
          <Link href="/community" className="secondary-action">Open Community</Link>
        </div>
      </div>
    </main>
  );
}
