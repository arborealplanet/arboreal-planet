import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");
const chondroShopPath = path.join(root, "src/components/ChondroBreederExpandedShop.tsx");

if (fs.existsSync(chondroShopPath)) {
  let shop = fs.readFileSync(chondroShopPath, "utf8");
  shop = shop
    .replace("Expanded daily listings", "Green Tree Pythons")
    .replace("20 snakes available now", "20 Green Tree Pythons available now")
    .replace("Scrollable snake store listings", "Scrollable Green Tree Python store listings")
    .replace("Swipe to browse all {offers.length} listings", "Swipe to browse all {offers.length} Green Tree Python listings")
    .replace("Loading snake store…", "Loading Green Tree Python market…");
  fs.writeFileSync(chondroShopPath, shop);
  console.log("[keeper-market-bars] Normalized the Green Tree Python carousel labels.");
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[keeper-market-bars] Workspace source not found; skipping Animal Market layout patch.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");

const oldMarketImport = 'import { ArborealKeeperEmeraldMarketBar } from "@/components/ArborealKeeperEmeraldMarketBar";';
const newMarketImport = 'import { ArborealKeeperStoreEmeraldCarousel } from "@/components/ArborealKeeperStoreEmeraldCarousel";';
source = source.split(oldMarketImport + "\n").join("");
source = source.split(oldMarketImport).join("");
if (!source.includes(newMarketImport)) {
  const anchor = 'import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";';
  if (source.includes(anchor)) source = source.replace(anchor, `${anchor}\n${newMarketImport}`);
  else console.warn("[keeper-market-bars] Could not find the Green Tree Python shop import anchor.");
}

// The old patch tried to wrap the entire program switcher with exact multi-line fragments.
// Small upstream changes made that brittle and left the full Emerald workspace mounted above
// the shop. Hide the switcher on the shared market using only its unique opening wrapper.
const switcherOpen = '<div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">\n        <div className="grid gap-2 rounded-[24px] border border-white/[.06] bg-[#05100b] p-2 sm:grid-cols-2">';
const hiddenSwitcherOpen = '<div className={view === "market" ? "hidden" : "mx-auto mt-4 max-w-7xl px-4 sm:px-6"}>\n        <div className="grid gap-2 rounded-[24px] border border-white/[.06] bg-[#05100b] p-2 sm:grid-cols-2">';
if (!source.includes(hiddenSwitcherOpen) && source.includes(switcherOpen)) {
  source = source.replace(switcherOpen, hiddenSwitcherOpen);
}

const emeraldConditional = '{activeProgram === "emerald" ? <ArborealKeeperEmeraldWorkspace mode={view} /> : null}';
const emeraldMarketGuard = '{activeProgram === "emerald" && view !== "market" ? <ArborealKeeperEmeraldWorkspace mode={view} /> : null}';
source = source.split(emeraldConditional).join(emeraldMarketGuard);

// If an earlier shell patch mounted Emerald directly because the program-switcher rewrite
// missed its target, guard that direct line as well. The line-anchored expression avoids
// touching the component tag nested inside the conditional above.
source = source.replace(
  /^([ \t]*)<ArborealKeeperEmeraldWorkspace mode=\{view\} \/>\s*$/gm,
  '$1{view !== "market" ? <ArborealKeeperEmeraldWorkspace mode={view} /> : null}',
);

source = source
  .split('className={activeProgram === "gtp" ? "" : "hidden"} aria-hidden={activeProgram !== "gtp"}')
  .join('className={view === "market" || activeProgram === "gtp" ? "" : "hidden"} aria-hidden={view !== "market" && activeProgram !== "gtp"}');

const singleMarket = '      {view === "market" ? <ChondroBreederExpandedShop /> : null}';
const stackedMarket = `      {view === "market" ? (<>
        <ChondroBreederExpandedShop />
        <ArborealKeeperStoreEmeraldCarousel />
      </>) : null}`;
if (source.includes(singleMarket)) source = source.replace(singleMarket, stackedMarket);

// Normalize any previous generated version of the stacked market instead of adding another.
source = source.split("<ArborealKeeperEmeraldMarketBar />").join("<ArborealKeeperStoreEmeraldCarousel />");

// If a partially generated build has the GTP shop but no Emerald carousel, add it exactly once.
if (!source.includes("<ArborealKeeperStoreEmeraldCarousel />")) {
  const marketTag = '<ChondroBreederExpandedShop />';
  const marketIndex = source.indexOf(marketTag);
  if (marketIndex >= 0) {
    const insertion = marketIndex + marketTag.length;
    source = source.slice(0, insertion) + "\n        <ArborealKeeperStoreEmeraldCarousel />" + source.slice(insertion);
  } else {
    console.warn("[keeper-market-bars] Could not find the market mount for the Emerald carousel.");
  }
}

source = source.replace(
  '<strong className="text-amber-100">Snake Store:</strong> rotating chondros are below. Purchases use your breeder cash and require an open enclosure.',
  '<strong className="text-amber-100">Animal Market:</strong> Green Tree Pythons are first, with Northern and Amazon Basin Emerald Tree Boas in the matching carousel directly underneath. Purchases use the shared keeper budget and compatible facility housing.',
);

fs.writeFileSync(workspacePath, source);
console.log("[keeper-market-bars] Enforced GTP-first then Emerald Tree Boa carousel layout and removed the duplicate Emerald market workspace.");
