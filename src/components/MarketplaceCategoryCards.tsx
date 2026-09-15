"use client";

const categories = [
  ["Animals", "ANIMAL", "Reptiles and other permitted animals", "◇"],
  ["Plants", "PLANT", "Nepenthes, bromeliads and terrarium plants", "⌁"],
  ["Enclosures", "ENCLOSURE", "Caging, racks, perches and habitat systems", "▤"],
  ["Supplies", "SUPPLY", "Lighting, controls, tools and husbandry gear", "＋"],
  ["Feeders", "FEEDER", "Feeder listings and breeder supplies", "◌"],
] as const;

export function MarketplaceCategoryCards() {
  function choose(category: string) {
    window.dispatchEvent(new CustomEvent("marketplace-category-filter", { detail: { category } }));
    document.querySelector("[data-marketplace-explorer]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categories.map(([title, value, text, icon]) => <button type="button" key={value} onClick={() => choose(value)} className="panel interactive-card min-h-40 rounded-[22px] p-5 text-left"><div className="grid h-10 w-10 place-items-center rounded-xl border border-white/[.065] bg-white/[.018] text-emerald-300/70">{icon}</div><div className="mt-5 font-semibold">{title}</div><p className="mt-2 text-xs leading-5 text-white/50">{text}</p><div className="mt-4 text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">Browse listings →</div></button>)}</div>;
}
