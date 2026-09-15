export function GtpLocalityConfidenceGuide() {
  return (
    <section className="panel rounded-[30px] p-5 sm:p-7">
      <div className="section-kicker">How to read locality labels</div>
      <h2 className="mt-3 text-2xl font-semibold">Subspecies first. Locality second.</h2>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-white/50">
        In the Green Tree Python hobby, locality names are useful labels for the lines animals have been associated with, but they are usually not something we can independently prove for an individual captive snake. A snake called Jayapura, Biak, Sorong or another locality generally carries that name because of the history attached to its line or import, not because there is definitive geographic evidence tying that individual animal to one exact place.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-[22px] border border-emerald-300/10 bg-emerald-300/[.025] p-5">
          <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-100/55">Subspecies</div>
          <h3 className="mt-2 text-lg font-semibold text-white/76">The stronger biological target</h3>
          <p className="mt-3 text-xs leading-6 text-white/40">
            Subspecies represent broader evolutionary and geographic groupings. Even when an exact locality cannot be verified, morphology, ancestry information and future genetic tools can give us a much better chance of placing an animal within the correct subspecies than assigning one precise locality with certainty.
          </p>
        </article>

        <article className="rounded-[22px] border border-amber-200/10 bg-amber-200/[.025] p-5">
          <div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/55">Locality</div>
          <h3 className="mt-2 text-lg font-semibold text-white/76">Useful, but more specific than we can usually prove</h3>
          <p className="mt-3 text-xs leading-6 text-white/40">
            Different localities can overlap in appearance, and visual resemblance alone cannot demonstrate geographic origin. For that reason, Arboreal Planet treats locality as a reported line designation rather than definitive proof that a snake came from one exact place.
          </p>
        </article>

        <article className="rounded-[22px] border border-sky-300/10 bg-sky-300/[.025] p-5">
          <div className="text-[10px] font-black uppercase tracking-[.14em] text-sky-100/55">Future research</div>
          <h3 className="mt-2 text-lg font-semibold text-white/76">Better reference data could narrow the picture</h3>
          <p className="mt-3 text-xs leading-6 text-white/40">
            If future research combines dense genetic sampling with georeferenced wild reference data—samples whose collection locations are accurately recorded—we may eventually be able to compare captive animals against much stronger geographic reference sets and narrow ancestry toward particular populations or localities with far greater confidence.
          </p>
        </article>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/10 p-4 text-xs leading-6 text-white/42">
        <strong className="text-white/68">Arboreal Planet approach:</strong> keep established locality names attached to the lines that use them, but do not treat those labels as independently verified geographic proof. When discussing biological identity, give more weight to the broader subspecies placement and be clear about uncertainty at the locality level.
      </div>
    </section>
  );
}
