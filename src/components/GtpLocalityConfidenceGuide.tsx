export function GtpLocalityConfidenceGuide() {
  return (
    <section className="panel rounded-[30px] p-5 sm:p-7">
      <div className="section-kicker">A quick note on locality names</div>
      <h2 className="mt-3 text-2xl font-semibold">Locality is useful. Subspecies matters more.</h2>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
        Green Tree Pythons are commonly imported, sold and discussed under locality names such as Jayapura, Biak, Sorong or Aru. Those names are useful in the hobby, but the broader subspecies is the more important biological grouping when thinking about breeding.
      </p>
      <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.025] p-4 text-sm leading-7 text-white/48">
        If a locality label is wrong but both parents still belong to the same subspecies, their offspring are still pure for that subspecies. For example, two different localities within <em>Morelia azurea utaraensis</em> can produce mixed-locality offspring that are still pure <em>M. a. utaraensis</em>.
      </div>
      <p className="mt-4 max-w-4xl text-xs leading-6 text-white/34">
        Exact locality is much harder to verify than subspecies. Future genetic testing paired with well-mapped wild reference samples may eventually let us narrow animals to local populations with much greater confidence.
      </p>
    </section>
  );
}
