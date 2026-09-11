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
console.log("Focused-screen compatibility now only hides legacy core-game sections.");
