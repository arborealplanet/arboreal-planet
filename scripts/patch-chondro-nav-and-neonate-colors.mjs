import fs from "node:fs";

const shopFile = "src/components/ChondroBreederExpandedShop.tsx";
let shop = fs.readFileSync(shopFile, "utf8");
shop = shop.replace(
  '  const neonateColor: "Red" | "Yellow" = random() < 0.4 ? "Red" : "Yellow";',
  '  const neonateColor: "Red" | "Yellow" = subspecies === "Morelia viridis" ? "Yellow" : random() < 0.4 ? "Red" : "Yellow";',
);
fs.writeFileSync(shopFile, shop);

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");
game = game.replace(
  '    neonateColor: raw.classification === "Pure"\n      ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)\n      : raw.neonateColor,',
  '    neonateColor: subspecies === "Morelia viridis" || locality === "Aru" || locality === "Merauke"\n      ? "Yellow"\n      : raw.classification === "Pure"\n        ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)\n        : raw.neonateColor,',
);
fs.writeFileSync(gameFile, game);

console.log("Enforced yellow-only M. viridis, Aru and Merauke neonate records.");
