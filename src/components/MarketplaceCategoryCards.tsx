"use client";

const categories = [
  ["Animals", "ANIMAL", "Reptiles and other permitted animals", "/marketplace/categories/animals.webp"],
  ["Plants", "PLANT", "Nepenthes, bromeliads and terrarium plants", "/marketplace/categories/plants.webp"],
  ["Enclosures", "ENCLOSURE", "Caging, racks, perches and habitat systems", "/marketplace/categories/enclosures.webp"],
  ["Supplies", "SUPPLY", "Lighting, controls, tools and husbandry gear", "/marketplace/categories/supplies.webp"],
  ["Feeders", "FEEDER", "Feeder listings and breeder supplies", "/marketplace/categories/feeders.webp"],
] as const;

export function MarketplaceCategoryCards() {
  function choose(category: string) {
    window.dispatchEvent(new CustomEvent("marketplace-category-filter", { detail: { category } }));
    document.querySelector("[data-marketplace-explorer]")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categories.map(([title, value, text, icon]) => <button type="button" key={value} onClick={() => choose(value)} className="panel interactive-card min-h-40 rounded-[22px] p-5 text-left"><img src={icon} alt="" className="h-10 w-10 rounded-xl border border-white/[.065] object-cover"/><div className="mt-5 font-semibold">{title}</div><p className="mt-2 text-xs leading-5 text-white/50">{text}</p><div className="mt-4 text-[9px] font-black uppercase tracking-[.12em] text-emerald-200/45">Browse listings →</div></button>)}</div>;
}
