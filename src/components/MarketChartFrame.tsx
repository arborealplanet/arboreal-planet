type MarketChartFrameProps = {
  title: string;
  subtitle: string;
  legends?: string[];
  status?: string;
  compact?: boolean;
};

export function MarketChartFrame({ title, subtitle, legends = [], status = "Trend unlocks after enough dated observations accumulate.", compact = false }: MarketChartFrameProps) {
  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-4 border-b border-white/[.065] px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white sm:text-lg">{title}</h3>
          <p className="mt-1.5 text-xs leading-5 text-white/38 sm:text-sm">{subtitle}</p>
        </div>
        {legends.length ? (
          <div className="flex flex-wrap gap-2">
            {legends.map((legend, index) => (
              <span key={legend} className="inline-flex items-center gap-1.5 rounded-full border border-white/[.08] bg-black/10 px-2.5 py-1 text-[10px] font-semibold text-white/50">
                <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-emerald-300" : index === 1 ? "bg-cyan-300" : "bg-amber-200"}`} />
                {legend}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className={`chart-grid relative ${compact ? "h-52" : "h-72"}`}>
        <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[9px] font-medium uppercase tracking-[.16em] text-white/18">
          <span>Market history</span><span>Median-first</span>
        </div>
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <div>
            <div className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-full border border-emerald-300/15 bg-emerald-300/[.05] text-sm text-emerald-200/60">↗</div>
            <div className="text-sm font-semibold text-white/58">No fabricated line</div>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-white/30">{status}</p>
          </div>
        </div>
        <div className="absolute inset-x-5 bottom-4 flex justify-between text-[9px] text-white/18"><span>OLDER</span><span>RECENT</span></div>
      </div>
    </div>
  );
}
