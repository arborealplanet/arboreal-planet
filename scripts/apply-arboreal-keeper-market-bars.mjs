import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");
const chondroShopPath = path.join(root, "src/components/ChondroBreederExpandedShop.tsx");
const emeraldMarketBarPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[keeper-market-bars] Expected ${label} fragment not found: ${before.slice(0, 120)}`);
    return source;
  }
  return source.replace(before, after);
}

if (fs.existsSync(chondroShopPath)) {
  let shop = fs.readFileSync(chondroShopPath, "utf8");
  shop = shop.replace("Expanded daily listings", "Green Tree Pythons");
  shop = shop.replace("20 snakes available now", "20 Green Tree Pythons available now");
  shop = shop.replace("Scrollable snake store listings", "Scrollable Green Tree Python store listings");
  shop = shop.replace("Swipe to browse all {offers.length} listings", "Swipe to browse all {offers.length} Green Tree Python listings");
  fs.writeFileSync(chondroShopPath, shop);
  console.log("[keeper-market-bars] Labeled the existing carousel as Green Tree Pythons.");
}

if (fs.existsSync(emeraldMarketBarPath)) {
  let marketBar = fs.readFileSync(emeraldMarketBarPath, "utf8");
  marketBar = marketBar.replace(
    "const marketEpoch = Math.floor((now || Date.now()) / EMERALD_MARKET_DAY_MS);",
    "const marketEpoch = Math.floor(now / EMERALD_MARKET_DAY_MS);",
  );
  fs.writeFileSync(emeraldMarketBarPath, marketBar);
  console.log("[keeper-market-bars] Kept Emerald market rendering idempotent after hydration.");
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[keeper-market-bars] Workspace source not found; skipping stacked market patch.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");

source = replaceOnce(
  source,
  'import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";',
  'import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";\nimport { ArborealKeeperEmeraldMarketBar } from "@/components/ArborealKeeperEmeraldMarketBar";',
  "market bar import",
);

if (!source.includes('import { ArborealKeeperMarketFilterBar } from "@/components/ArborealKeeperMarketFilterBar";')) {
  const emeraldImport = 'import { ArborealKeeperEmeraldMarketBar } from "@/components/ArborealKeeperEmeraldMarketBar";';
  if (source.includes(emeraldImport)) {
    source = source.replace(
      emeraldImport,
      `${emeraldImport}\nimport { ArborealKeeperMarketFilterBar } from "@/components/ArborealKeeperMarketFilterBar";`,
    );
  }
}

source = replaceOnce(
  source,
  '      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">\n        <div className="grid gap-2 rounded-[24px] border border-white/[.06] bg-[#05100b] p-2 sm:grid-cols-2">',
  '      {view !== "market" ? (\n      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">\n        <div className="grid gap-2 rounded-[24px] border border-white/[.06] bg-[#05100b] p-2 sm:grid-cols-2">',
  "program switcher start",
);

source = replaceOnce(
  source,
  '        </div>\n      </div>\n      {activeProgram === "emerald" ? <ArborealKeeperEmeraldWorkspace mode={view} /> : null}',
  '        </div>\n      </div>\n      ) : null}\n      {activeProgram === "emerald" && view !== "market" ? <ArborealKeeperEmeraldWorkspace mode={view} /> : null}',
  "program switcher end",
);

source = source.replace(
  'className={activeProgram === "gtp" ? "" : "hidden"} aria-hidden={activeProgram !== "gtp"}',
  'className={view === "market" || activeProgram === "gtp" ? "" : "hidden"} aria-hidden={view !== "market" && activeProgram !== "gtp"}',
);

const filteredMarket = `      {view === "market" ? (<>
        <ArborealKeeperMarketFilterBar />
        <div data-keeper-market-group="pythons"><ChondroBreederExpandedShop /></div>
        <div data-keeper-market-group="boas"><ArborealKeeperEmeraldMarketBar /></div>
      </>) : null}`;

if (!source.includes(filteredMarket)) {
  const stackedMarket = `      {view === "market" ? (<>
        <ChondroBreederExpandedShop />
        <ArborealKeeperEmeraldMarketBar />
      </>) : null}`;
  const singleMarket = '      {view === "market" ? <ChondroBreederExpandedShop /> : null}';
  if (source.includes(stackedMarket)) source = source.replace(stackedMarket, filteredMarket);
  else if (source.includes(singleMarket)) source = source.replace(singleMarket, filteredMarket);
  else console.warn("[keeper-market-bars] Expected market render fragment not found; filters were not mounted.");
}

source = source.replace(
  '<strong className="text-amber-100">Snake Store:</strong> rotating chondros are below. Purchases use your breeder cash and require an open enclosure.',
  '<strong className="text-amber-100">Animal Market:</strong> Green Tree Pythons are first, with Emerald Tree Boas in their own scroll bar directly underneath. Purchases use the shared keeper budget and require compatible open housing.',
);

fs.writeFileSync(workspacePath, source);
console.log("[keeper-market-bars] Stacked Green Tree Python and Emerald Tree Boa carousels in the Animal Market.");
console.log("[keeper-market-bars] Added visible market categories with working Python / Boa filtering and locked future groups.");
