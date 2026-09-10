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

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");

if (!workspace.includes('import { ChondroCollectionManager } from "@/components/ChondroCollectionManager";')) {
  workspace = workspace.replace(
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\n',
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\nimport { ChondroCollectionManager } from "@/components/ChondroCollectionManager";\n',
  );
}

workspace = workspace.replace(
  '{view === "colony" ? <div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div> : null}',
  '{view === "colony" ? <><div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroCollectionManager /></div><div className="mx-auto mt-5 max-w-7xl px-5 sm:px-6"><ChondroRetiredBreedersPanel /></div></> : null}',
);

workspace = workspace.replace(
  'colony: { eyebrow: "Collection", title: "Colony", detail: "Inspect active animals, testing, care, enclosure capacity and retired breeders." },',
  'colony: { eyebrow: "Collection", title: "Colony", detail: "Browse your snakes first. Open an animal for pedigree and detailed records; enclosure capacity stays above the collection." },',
);

workspace = workspace.replace(
  'clutches: { eyebrow: "Offspring", title: "Clutches", detail: "Manage the active clutch and review historical clutch records." },',
  'clutches: { eyebrow: "Offspring", title: "Clutches", detail: "Work the active clutch here, then use the record section below for completed breeding history." },',
);

workspace = workspace.replace(
  'market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Buy chondros from rotating game inventory or browse animals listed by other breeders." },',
  'market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Browse one clear game inventory below, then use the player market for breeder-to-breeder listings." },',
);

fs.writeFileSync(workspaceFile, workspace);
console.log("Focused Chondro colony, clutch and store screens around dedicated UI components.");
