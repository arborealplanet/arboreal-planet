export function ChondroPatternBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="img"
      aria-label="Red and yellow chondro pattern among banana plants and pitcher plants"
      className={`relative overflow-hidden border border-emerald-300/15 bg-[#f5f1df] shadow-2xl shadow-black/25 ${compact ? "min-h-44 rounded-[26px] sm:min-h-56" : "min-h-64 sm:min-h-80 sm:rounded-[30px]"}`}
      style={{ backgroundImage: "url('/branding/chondro-pattern.webp')", backgroundPosition: "center", backgroundRepeat: "repeat", backgroundSize: compact ? "430px auto" : "560px auto" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#032319]/90 via-[#062b1c]/48 to-[#032319]/12" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 sm:p-8">
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-100/80">Arboreal Arcade</div>
        <div className={`${compact ? "mt-1 text-3xl sm:text-4xl" : "mt-2 text-4xl sm:text-6xl"} font-black tracking-[-.04em] text-white`}>Chondro Breeder</div>
      </div>
    </div>
  );
}
