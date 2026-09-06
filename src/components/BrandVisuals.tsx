import Link from "next/link";

function Leaf({ className = "" }: { className?: string }) {
  return <span className={`absolute block rounded-[100%_0_100%_0] bg-emerald-700/35 ${className}`} />;
}

export function ArborealPlanetMark({ className = "" }: { className?: string }) {
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-300/25 bg-[#07160f] shadow-[0_0_30px_rgba(52,211,153,.10)] ${className}`} aria-label="Arboreal Planet logo mark">
      <div className="absolute h-[68%] w-[68%] rounded-full border border-emerald-200/60" />
      <div className="absolute h-[52%] w-[52%] rounded-full border border-emerald-300/25" />
      <div className="absolute left-[20%] top-[47%] h-[2px] w-[60%] -rotate-12 bg-emerald-200/35" />
      <div className="absolute bottom-[17%] right-[14%] h-[40%] w-[22%] rotate-[24deg] rounded-[100%_0_100%_0] bg-emerald-400/75" />
      <div className="absolute bottom-[20%] right-[29%] h-[32%] w-[16%] -rotate-[15deg] rounded-[100%_0_100%_0] bg-emerald-300/45" />
      <span className="relative -translate-x-1 text-[9px] font-black tracking-[-.08em] text-white/80">AP</span>
    </div>
  );
}

function Pitcher({ left, top, scale = 1 }: { left: string; top: string; scale?: number }) {
  return (
    <div className="absolute" style={{ left, top, transform: `scale(${scale})` }}>
      <div className="h-10 w-6 rounded-b-[45%] rounded-t-[32%] border border-rose-200/15 bg-gradient-to-b from-rose-900/75 to-amber-950/80 shadow-[inset_0_0_10px_rgba(0,0,0,.35)]" />
      <div className="absolute -left-1 -top-1 h-2.5 w-8 -rotate-6 rounded-full border border-rose-200/20 bg-rose-950" />
      <div className="absolute left-2.5 -top-7 h-7 w-[2px] bg-emerald-700/55" />
    </div>
  );
}

function SnakeStocksMascot() {
  return (
    <div className="relative mx-auto h-[250px] w-[190px] sm:h-[300px] sm:w-[230px]">
      <div className="absolute left-[61px] top-[9px] z-20 h-12 w-28 -rotate-3 rounded-[55%_55%_28%_28%] border-2 border-black/45 bg-[#243c20] shadow-xl sm:left-[73px] sm:h-14 sm:w-32" />
      <div className="absolute left-[70px] top-[2px] z-10 h-16 w-20 rounded-[60%_45%_30%_25%] border-2 border-black/45 bg-[#314c2b] sm:left-[84px] sm:h-20 sm:w-24" />
      <div className="absolute left-[70px] top-[38px] z-10 h-28 w-24 rounded-[46%_50%_34%_42%] border-2 border-black/45 bg-gradient-to-r from-[#9d9666] via-[#c2b77f] to-[#797b50] sm:left-[84px] sm:h-32 sm:w-28">
        <div className="absolute right-4 top-7 h-4 w-4 rounded-full bg-amber-300 shadow-[inset_0_0_0_4px_#5a4520]" />
        <div className="absolute right-[21px] top-[29px] h-3 w-[2px] bg-black" />
        <div className="absolute bottom-7 right-2 h-4 w-14 rotate-3 rounded-b-full border-b-2 border-black/40" />
      </div>
      <div className="absolute left-[87px] top-[128px] h-20 w-14 rounded-b-[45%] bg-gradient-to-r from-[#b8aa73] to-[#7f8054] sm:left-[105px] sm:top-[148px] sm:h-24 sm:w-16" />
      <div className="absolute bottom-0 left-[24px] h-28 w-40 rounded-t-[48%] border-2 border-black/50 bg-[#252d2f] shadow-2xl sm:left-[27px] sm:h-32 sm:w-48">
        <div className="pt-5 text-center text-sm font-black leading-[.9] text-white sm:text-base">SNAKE<br/>STOCKS</div>
        <div className="relative mx-auto mt-2 h-9 w-24">
          <div className="absolute left-1 top-3 h-4 w-20 rotate-[13deg] rounded-full border border-black/30 bg-[#758052]" />
          <div className="absolute left-3 top-3 h-4 w-20 -rotate-[13deg] rounded-full border border-black/30 bg-[#5f6945]" />
        </div>
        <div className="mt-1 text-center text-xs font-black text-white sm:text-sm">STONKS</div>
      </div>
    </div>
  );
}

export function SnakeStocksBrandBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[30px] border border-emerald-300/15 bg-[#031008] shadow-[0_28px_90px_rgba(0,0,0,.32)] ${compact ? "min-h-[250px]" : "min-h-[390px]"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_30%,rgba(70,150,70,.22),transparent_34%),radial-gradient(circle_at_80%_22%,rgba(34,197,94,.15),transparent_30%),linear-gradient(135deg,#07150d,#020805_72%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(34,197,94,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      <Leaf className="-left-5 top-8 h-24 w-44 -rotate-[18deg]" /><Leaf className="left-3 bottom-2 h-24 w-48 rotate-[12deg]" />
      <Leaf className="right-5 top-0 h-28 w-48 rotate-[15deg]" /><Leaf className="right-0 bottom-0 h-24 w-44 -rotate-[18deg]" />
      <Pitcher left="2%" top="8%" scale={1.1} /><Pitcher left="94%" top="10%" scale={1.15} /><Pitcher left="91%" top="70%" scale={.9} />
      <div className="absolute right-[6%] top-[18%] hidden h-[43%] w-[36%] md:block">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(34,197,94,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,.22)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute bottom-[18%] left-[4%] h-1 w-[88%] origin-left -rotate-[21deg] bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,.65)]" />
        <div className="absolute right-[2%] top-[9%] h-0 w-0 rotate-[23deg] border-b-[13px] border-l-[23px] border-t-[13px] border-b-transparent border-l-emerald-400 border-t-transparent" />
        {[18,30,42,54,66,78].map((left, i) => <div key={left} className={`absolute bottom-[${20 + i * 8}%] h-${i % 2 ? 12 : 16} w-2 ${i === 2 ? "bg-red-500" : "bg-emerald-400"}`} style={{ left: `${left}%`, bottom: `${20 + i * 8}%`, height: `${30 + (i % 3) * 18}px` }} />)}
      </div>

      <div className={`relative z-10 grid items-center gap-5 p-5 sm:p-8 ${compact ? "md:grid-cols-[.7fr_1.3fr]" : "md:grid-cols-[.72fr_1.28fr]"}`}>
        <div className={compact ? "hidden md:block" : "block"}><SnakeStocksMascot /></div>
        <div className="relative text-center md:text-left">
          <div className="text-[10px] font-black uppercase tracking-[.3em] text-emerald-300/70">Arboreal Planet presents</div>
          <div className="mt-3 font-serif text-5xl font-black leading-[.8] tracking-[-.06em] text-[#f3f0e4] drop-shadow-[0_4px_0_rgba(0,0,0,.5)] sm:text-7xl lg:text-[84px]">SNAKE<br/>STOCKS</div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-[.24em] text-emerald-200/75 md:justify-start"><span>Track</span><span>·</span><span>Compare</span><span>·</span><span>Discover</span></div>
          {!compact && <>
            <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">{["BASE ANIMALS","MORPHS","LOCALITIES","MARKET TRENDS"].map((item) => <span key={item} className="rounded-md border border-amber-100/15 bg-[#5d4025]/55 px-3 py-2 text-[9px] font-black tracking-[.09em] text-amber-50/75 shadow-lg">{item}</span>)}</div>
            <div className="mt-6 font-serif text-lg italic text-emerald-300/60">Knowledge Breeds Opportunities</div>
          </>}
        </div>
      </div>
    </div>
  );
}

export function ArborealsByBunnBadge() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[.07] bg-black/20 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,rgba(57,230,125,.09),transparent_35%)]" />
      <div className="relative flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <div className="absolute inset-0 rounded-full border border-emerald-300/15" />
          <div className="absolute left-3 top-7 h-7 w-14 rounded-full border-[7px] border-emerald-400/65" />
          <Pitcher left="2%" top="30%" scale={.55} /><Pitcher left="76%" top="30%" scale={.55} />
        </div>
        <div><div className="font-serif text-xl font-black tracking-[.04em] text-white/85">ARBOREALS</div><div className="text-xs font-black tracking-[.18em] text-white/55">BY BUNN</div><div className="mt-1 text-[9px] uppercase tracking-[.15em] text-emerald-300/45">Founding breeder brand</div></div>
      </div>
    </div>
  );
}

export function SnakeStocksHomeFeature() {
  return (
    <Link href="/snake-stocks" className="block">
      <SnakeStocksBrandBanner compact />
    </Link>
  );
}
