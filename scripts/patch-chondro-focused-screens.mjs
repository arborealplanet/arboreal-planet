import fs from "node:fs";

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");

if (!game.includes("hideLegacySectionForFocusedScreen")) {
  game = game.replace(
    'function CollapsibleGameSection({\n',
    'function hideLegacySectionForFocusedScreen(activeScreen: BreederGameScreen, label: string) {\n  const value = label.toLowerCase();\n  if (activeScreen === "colony" && (value.includes("your colony") || value.includes("genetics & locality"))) return true;\n  if (activeScreen === "clutches" && value.includes("program records")) return true;\n  if (activeScreen === "market" && value.includes("daily snake store")) return true;\n  return false;\n}\n\nfunction CollapsibleGameSection({\n',
  );

  game = game.replace(
    '  const targetScreen = sectionScreen(label);\n  if (activeScreen !== "all" && targetScreen !== "shared" && targetScreen !== activeScreen) return null;\n',
    '  const targetScreen = sectionScreen(label);\n  if (activeScreen !== "all" && targetScreen !== "shared" && targetScreen !== activeScreen) return null;\n  if (hideLegacySectionForFocusedScreen(activeScreen, label)) return null;\n',
  );
}

fs.writeFileSync(gameFile, game);

const collectionFile = "src/components/ChondroCollectionManager.tsx";
let collection = fs.readFileSync(collectionFile, "utf8");
if (!collection.includes('import { ChondroAnimalRecordActions } from "@/components/ChondroAnimalRecordActions";')) {
  collection = collection.replace(
    'import { ChondroFocusOverlay } from "@/components/ChondroFocusOverlay";\n',
    'import { ChondroFocusOverlay } from "@/components/ChondroFocusOverlay";\nimport { ChondroAnimalRecordActions } from "@/components/ChondroAnimalRecordActions";\n',
  );
}
collection = collection.replace(
  '    window.addEventListener("arboreal-chondro-favorites-change", refresh);\n    return () => { cancelled = true; window.removeEventListener("arboreal-chondro-favorites-change", refresh); };',
  '    window.addEventListener("arboreal-chondro-favorites-change", refresh);\n    window.addEventListener("arboreal-chondro-breeder-save-change", refresh);\n    return () => { cancelled = true; window.removeEventListener("arboreal-chondro-favorites-change", refresh); window.removeEventListener("arboreal-chondro-breeder-save-change", refresh); };',
);
if (!collection.includes('<ChondroAnimalRecordActions')) {
  collection = collection.replace(
    '  return (\n    <div className="space-y-5">\n      <div className="rounded-[24px]',
    '  return (\n    <div className="space-y-5">\n      <ChondroAnimalRecordActions key={animal.id} animalId={animal.id} initialName={animal.name} initialNotes={animal.notes} favorite={favorite} />\n      <div className="rounded-[24px]',
  );
} else {
  collection = collection.replace(
    '<ChondroAnimalRecordActions animalId={animal.id}',
    '<ChondroAnimalRecordActions key={animal.id} animalId={animal.id}',
  );
}
fs.writeFileSync(collectionFile, collection);

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");

if (!workspace.includes('import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";')) {
  workspace = workspace.replace(
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\n',
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\nimport { ChondroCollectionManager } from "@/components/ChondroCollectionManager";\n',
  );
}

if (!workspace.includes('import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";')) {
  workspace = workspace.replace(
    'import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";\n',
    'import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";\nimport { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\n',
  );
}

if (!workspace.includes('import { ChondroActiveClutchShowcase } from "@/components/ChondroActiveClutchShowcase";')) {
  workspace = workspace.replace(
    'import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\n',
    'import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\nimport { ChondroActiveClutchShowcase } from "@/components/ChondroActiveClutchShowcase";\n',
  );
}

workspace = workspace.replace(
  '{view === "colony" ? <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div> : null}',
  '{view === "colony" ? <><div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroCollectionManager /></div><div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div></> : null}',
);

workspace = workspace.replace(
  'colony: { eyebrow: "Collection", title: "Colony", detail: "Inspect active animals, testing, care, enclosure capacity and retired breeders." },',
  'colony: { eyebrow: "Collection", title: "Colony", detail: "Browse your snakes first. Open an animal for naming, testing, notes, sale, retirement and detailed records; enclosure capacity stays above the collection." },',
);

workspace = workspace.replace(
  'clutches: { eyebrow: "Offspring", title: "Clutches", detail: "Manage the active clutch and review historical clutch records." },',
  'clutches: { eyebrow: "Offspring", title: "Clutches", detail: "See the active clutch first, make establishment and holdback decisions, then review completed breeding history below." },',
);

workspace = workspace.replace(
  'market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Buy chondros from rotating game inventory or browse animals listed by other breeders." },',
  'market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Browse one clear game inventory below, then use the player market for breeder-to-breeder listings." },',
);

const oldMarketOrder = `      <ChondroBreederGameV3 screen={view} />
      {view === "market" ? <ChondroBreederExpandedShop /> : null}
      {view === "breeding" ? <ChondroClutchOutcomeExplainer /> : null}`;
const newMarketOrder = `      {view === "market" ? <ChondroBreederExpandedShop /> : null}
      {view === "clutches" ? <ChondroActiveClutchShowcase /> : null}
      <ChondroBreederGameV3 screen={view} />
      {view === "market" ? <ChondroFavoritesMarketPanel /> : null}
      {view === "breeding" ? <ChondroClutchOutcomeExplainer /> : null}`;
if (workspace.includes(oldMarketOrder)) workspace = workspace.replace(oldMarketOrder, newMarketOrder);

if (!workspace.includes('{view === "clutches" ? <ChondroActiveClutchShowcase /> : null}')) {
  workspace = workspace.replace(
    '      {view === "market" ? <ChondroBreederExpandedShop /> : null}\n      <ChondroBreederGameV3 screen={view} />',
    '      {view === "market" ? <ChondroBreederExpandedShop /> : null}\n      {view === "clutches" ? <ChondroActiveClutchShowcase /> : null}\n      <ChondroBreederGameV3 screen={view} />',
  );
}

fs.writeFileSync(workspaceFile, workspace);
console.log("Focused Chondro colony, clutch and store screens around dedicated UI components.");
