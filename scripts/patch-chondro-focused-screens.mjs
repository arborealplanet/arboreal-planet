import fs from "node:fs";

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");

if (!game.includes("hideLegacySectionForFocusedScreen")) {
  game = game.replace(
    'function CollapsibleGameSection({\n',
    'function hideLegacySectionForFocusedScreen(activeScreen: BreederGameScreen, label: string) {\n  const value = label.toLowerCase();\n  if (activeScreen !== "all" && value.includes("activity")) return true;\n  if (activeScreen === "colony" && (value.includes("your colony") || value.includes("genetics & locality"))) return true;\n  if (activeScreen === "clutches" && (value.includes("program records") || value.includes("active clutch"))) return true;\n  if (activeScreen === "market" && (value.includes("daily snake store") || value.includes("player snake market"))) return true;\n  return false;\n}\n\nfunction CollapsibleGameSection({\n',
  );

  game = game.replace(
    '  const targetScreen = sectionScreen(label);\n  if (activeScreen !== "all" && targetScreen !== "shared" && targetScreen !== activeScreen) return null;\n',
    '  const targetScreen = sectionScreen(label);\n  if (activeScreen !== "all" && targetScreen !== "shared" && targetScreen !== activeScreen) return null;\n  if (hideLegacySectionForFocusedScreen(activeScreen, label)) return null;\n',
  );
} else {
  game = game.replace(
    'if (activeScreen === "market" && value.includes("daily snake store")) return true;',
    'if (activeScreen === "market" && (value.includes("daily snake store") || value.includes("player snake market"))) return true;',
  );
}

const queueNeedle = '      {(breedingCycle || geneticTestsPending.length || facilityConstruction) ? (\n';
if (game.includes(queueNeedle)) {
  game = game.replace(
    queueNeedle,
    '      {screen === "all" && (breedingCycle || geneticTestsPending.length || facilityConstruction) ? (\n',
  );
}

fs.writeFileSync(gameFile, game);

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");

const imports = [
  ['import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\n', 'import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";\n'],
  ['import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";\n', 'import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\n'],
  ['import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\n', 'import { ChondroActiveClutchShowcase } from "@/components/ChondroActiveClutchShowcase";\n'],
  ['import { ChondroActiveClutchShowcase } from "@/components/ChondroActiveClutchShowcase";\n', 'import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";\n'],
];
for (const [anchor, addition] of imports) {
  if (!workspace.includes(addition.trim())) workspace = workspace.replace(anchor, anchor + addition);
}

workspace = workspace.replace(
  'colony: { eyebrow: "Collection", title: "Colony", detail: "Inspect active animals, testing, care, enclosure capacity and retired breeders." },',
  'colony: { eyebrow: "Collection", title: "Colony", detail: "Browse your snakes first. Open an animal for naming, testing, notes, sale, retirement and detailed records. Enclosure management follows below the collection." },',
);
workspace = workspace.replace(
  'clutches: { eyebrow: "Offspring", title: "Clutches", detail: "Manage the active clutch and review historical clutch records." },',
  'clutches: { eyebrow: "Offspring", title: "Clutches", detail: "See the active clutch first, make establishment and holdback decisions, then review completed breeding history below." },',
);
workspace = workspace.replace(
  'market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Buy chondros from rotating game inventory or browse animals listed by other breeders." },',
  'market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Browse rotating game inventory first, then shop breeder-to-breeder listings and manage your seller activity." },',
);

const oldCore = `      <ChondroBreederGameV3 screen={view} />
      {view === "market" ? <ChondroBreederExpandedShop /> : null}
      {view === "breeding" ? <ChondroClutchOutcomeExplainer /> : null}
      {view === "colony" ? <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div> : null}
      {view === "clutches" ? <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div></section> : null}`;

const newCore = `      {view === "market" ? <ChondroBreederExpandedShop /> : null}
      {view === "market" ? <ChondroPlayerMarket /> : null}
      {view === "clutches" ? <ChondroActiveClutchShowcase /> : null}
      {view === "colony" ? <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroCollectionManager /></div> : null}
      <ChondroBreederGameV3 screen={view} />
      {view === "market" ? <ChondroFavoritesMarketPanel /> : null}
      {view === "breeding" ? <ChondroClutchOutcomeExplainer /> : null}
      {view === "colony" ? <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div> : null}
      {view === "clutches" ? <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div></section> : null}`;

if (workspace.includes(oldCore)) workspace = workspace.replace(oldCore, newCore);

fs.writeFileSync(workspaceFile, workspace);
console.log("Focused breeder patch now only handles screen composition and legacy-section hiding.");
