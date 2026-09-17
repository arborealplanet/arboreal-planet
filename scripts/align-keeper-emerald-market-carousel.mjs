import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src/components/ArborealKeeperEmeraldMarketBar.tsx");
if (!fs.existsSync(file)) {
  console.warn("[keeper-emerald-carousel] Market component missing; skipped.");
  process.exit(0);
}

let source = fs.readFileSync(file, "utf8");
const before = source;

// Match the Green Tree Python carousel exactly: same responsive card width,
// same internal padding and the same 160px / 192px portrait window.
source = source.replace(
  'className="w-[82%] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[.06] bg-black/10 sm:w-[48%] lg:w-[calc((100%-1.5rem)/3)]"',
  'className="w-[82%] shrink-0 snap-start rounded-2xl border border-white/[.06] bg-black/10 p-3 sm:w-[48%] lg:w-[calc((100%-1.5rem)/3)]"',
);

source = source.replace(
  'className="relative aspect-square overflow-hidden border-b border-white/[.055] bg-[radial-gradient(circle_at_50%_35%,rgba(110,231,183,.09),transparent_46%),#06100c]"',
  'className="relative h-40 overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 sm:h-48"',
);
source = source.replace(
  'className="relative h-40 overflow-hidden border-b border-white/[.055] bg-[radial-gradient(circle_at_50%_35%,rgba(110,231,183,.09),transparent_46%),#06100c] sm:h-48"',
  'className="relative h-40 overflow-hidden rounded-2xl border border-white/[.06] bg-black/20 sm:h-48"',
);

// The injected sprite renderer must fill the exact same portrait window as the
// Chondro image. The crop itself is controlled by emeraldSpriteStyle.
source = source.replace(
  'className="absolute inset-2 rounded-xl bg-black"',
  'className="absolute inset-0 rounded-2xl bg-black"',
);

// Avoid double-padding the Emerald card now that the card shell itself matches
// the Chondro card padding.
source = source.replace(
  '<div className="p-3">\n                      <div className="flex flex-wrap gap-1.5">',
  '<div className="pt-3">\n                      <div className="flex flex-wrap gap-1.5">',
);

source = source.replace(
  'A separate horizontal market directly beneath the Green Tree Python store. Every Emerald Tree Boa requires its own enclosure.',
  'Northern and Amazon Basin Emerald Tree Boas in the same swipeable card format as the Green Tree Pythons above. Every boa requires its own enclosure.',
);

source = source.replace(
  'Swipe to browse {offers.length} Emerald listings',
  'Swipe to browse all {offers.length} Emerald Tree Boa listings',
);

const imageEndMarker = '                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-10">';
if (!source.includes('>Virtual</div>') && source.includes(imageEndMarker)) {
  source = source.replace(
    imageEndMarker,
    '                      <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-emerald-100/20 bg-[#06100c]/85 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-emerald-100/75 shadow-lg backdrop-blur-sm">Virtual</div>\n' + imageEndMarker,
  );
}

if (source !== before) {
  fs.writeFileSync(file, source);
  console.log("[keeper-emerald-carousel] Matched Emerald sprite crops and card dimensions to the Green Tree Python carousel.");
} else {
  console.log("[keeper-emerald-carousel] Emerald carousel already aligned.");
}
