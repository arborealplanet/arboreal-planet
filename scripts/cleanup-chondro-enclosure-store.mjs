import fs from "node:fs";

const shopFile = "src/components/ChondroBreederExpandedShop.tsx";
let shop = fs.readFileSync(shopFile, "utf8");

const mapNeedle = 'const enclosurePrices: Record<EnclosureType, number> = { "Chondro Dojo Bin": 225, "PVC Arboreal": 650 };\n';
const mapReplacement = `${mapNeedle}const enclosureDisplay: Record<EnclosureType, { label: string; detail: string }> = {\n  "Chondro Dojo Bin": { label: "Chondro Dojo Enclosure", detail: "Clean tub-style chondro housing with the functional Dojo setup." },\n  "PVC Arboreal": { label: "PVC Arboreal Enclosure", detail: "Permanent front-opening arboreal housing built around PVC structure and perching." },\n};\n`;
if (!shop.includes("const enclosureDisplay:")) {
  if (!shop.includes(mapNeedle)) throw new Error("Could not find enclosure price map.");
  shop = shop.replace(mapNeedle, mapReplacement);
}

const oldCard = `              <article key={type} className="overflow-hidden rounded-[22px] border border-white/[.07] bg-black/15">\n                <div className="relative aspect-[16/8] overflow-hidden border-b border-white/[.06] bg-black/25">\n                  <Image src="/hatchery/game/pvc-enclosure.webp" alt={type} fill sizes="(max-width: 768px) 100vw, 50vw" className={type === "Chondro Dojo Bin" ? "object-cover object-[center_64%] opacity-90" : "object-cover object-center"} />\n                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10">\n                    <div className="text-lg font-semibold text-white">{type}</div>\n                  </div>\n                </div>\n                <div className="p-4">`;
const newCard = `              <article key={type} className="overflow-hidden rounded-[22px] border border-white/[.07] bg-black/15">\n                <div className="relative aspect-[16/8] overflow-hidden border-b border-white/[.06] bg-black/25">\n                  {type === "Chondro Dojo Bin" ? (\n                    <Image src="/hatchery/game/pvc-enclosure.webp" alt="Illustrated Chondro Dojo enclosure with white PVC perches" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover object-[center_64%] opacity-90" />\n                  ) : (\n                    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_30%,rgba(110,231,183,.10),transparent_42%),#07100c] p-5" aria-label="PVC arboreal enclosure diagram">\n                      <div className="relative h-[82%] w-[62%] rounded-xl border-2 border-white/35 bg-white/[.035] shadow-[inset_0_0_0_4px_rgba(255,255,255,.025)]">\n                        <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/15" />\n                        <div className="absolute left-[12%] right-[12%] top-[34%] h-2 rounded-full bg-white/55" />\n                        <div className="absolute left-[18%] right-[18%] top-[58%] h-2 rounded-full bg-white/45" />\n                        <div className="absolute bottom-[9%] right-[10%] h-6 w-10 rounded-t-full border border-sky-100/30 bg-sky-100/10" />\n                      </div>\n                    </div>\n                  )}\n                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10">\n                    <div className="text-lg font-semibold text-white">{enclosureDisplay[type].label}</div>\n                  </div>\n                </div>\n                <div className="p-4">\n                  <p className="mb-3 text-[11px] leading-5 text-white/38">{enclosureDisplay[type].detail}</p>`;
if (!shop.includes('aria-label="PVC arboreal enclosure diagram"')) {
  if (!shop.includes(oldCard)) throw new Error("Could not find enclosure store card markup.");
  shop = shop.replace(oldCard, newCard);
}
shop = shop.replace('"Buy " + type}', '"Buy " + enclosureDisplay[type].label}');
fs.writeFileSync(shopFile, shop);

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");
const startMarker = '      <CollapsibleGameSection label="Enclosures"';
const nextMarker = '      <CollapsibleGameSection label="Daily snake store"';
const start = game.indexOf(startMarker);
const next = game.indexOf(nextMarker);
if (start >= 0) {
  if (next < 0 || next <= start) throw new Error("Could not find end of legacy enclosure store section.");
  game = game.slice(0, start) + game.slice(next);
}
fs.writeFileSync(gameFile, game);

console.log("Made Store the single enclosure purchase surface and clarified enclosure visuals.");