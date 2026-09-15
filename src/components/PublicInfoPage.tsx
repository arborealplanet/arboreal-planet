import Link from "next/link";

type InfoSection = {
  title: string;
  paragraphs: string[];
};

export function PublicInfoPage({ eyebrow, title, intro, sections, updated = "September 15, 2026", actions }: { eyebrow: string; title: string; intro: string; sections: InfoSection[]; updated?: string; actions?: Array<{ label: string; href: string }> }) {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 pb-20 sm:px-6 lg:py-14">
      <div className="section-kicker">{eyebrow}</div>
      <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-.04em] text-white sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-white/56">{intro}</p>
      <div className="mt-4 text-[10px] font-bold uppercase tracking-[.12em] text-white/28">Last updated {updated}</div>

      {actions?.length ? <div className="mt-7 flex flex-wrap gap-3">{actions.map((action) => <Link key={action.href} href={action.href} className="secondary-action !min-h-0 !px-4 !py-2.5 !text-xs">{action.label}</Link>)}</div> : null}

      <div className="mt-9 space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="panel rounded-[24px] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white/78">{section.title}</h2>
            <div className="mt-3 space-y-3">{section.paragraphs.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-white/45">{paragraph}</p>)}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
