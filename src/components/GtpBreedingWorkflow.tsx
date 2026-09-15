import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Link parents",
    description: "Connect the dam and sire to an animal record. Published parents can belong to other keepers; ownership does not change.",
    href: "#breeding-parents",
  },
  {
    number: "02",
    title: "Record pairing",
    description: "Create an optional keeper-reported pairing with a year, pairing code and notes. Pairings can stay private or be published.",
    href: "#breeding-pairing",
  },
  {
    number: "03",
    title: "Group clutch",
    description: "Optionally group offspring under a specific pairing when their existing registered dam and sire already match that pairing.",
    href: "#breeding-clutch",
  },
  {
    number: "04",
    title: "Confirm producers",
    description: "Ask one or more producer accounts to confirm their role. Co-produced animals can credit multiple breeders independently.",
    href: "#breeding-producers",
  },
];

export function GtpBreedingWorkflow() {
  return (
    <section className="panel rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">Breeding workspace</div>
          <h2 className="mt-2 text-2xl font-semibold text-white/82">Use as much—or as little—of the workflow as you need.</h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-white/40">These steps organize breeding history without forcing every keeper into the same record-keeping style. Parentage, ownership, producer credits and pairing history remain separate.</p>
        </div>
        <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white/35">All steps optional</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <Link key={step.number} href={step.href} className="interactive-card rounded-2xl border border-white/[.06] bg-black/10 p-4">
            <div className="font-mono text-[10px] font-black text-emerald-200/42">{step.number}</div>
            <div className="mt-2 text-sm font-semibold text-white/70">{step.title}</div>
            <p className="mt-2 text-[11px] leading-5 text-white/34">{step.description}</p>
            <div className="mt-3 text-[10px] font-bold text-emerald-200/52">Go to step ↓</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
