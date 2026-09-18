import fs from "node:fs";
import crypto from "node:crypto";

const marketPath = "src/components/ArborealKeeperEmeraldMarketBar.tsx";
if (fs.existsSync(marketPath)) {
  const source = fs.readFileSync(marketPath, "utf8");
  let next = source;
  next = next.replace(/^import \{ emeraldArtStyleForAnimal \} from "@\/lib\/arboreal-keeper-emerald-art";\n/gm, "");
  next = next.replace(
    /^import \{[^\n]*ARBOREAL_KEEPER_SPECIES_BY_ID[^\n]*\} from "@\/lib\/arboreal-keeper-species";\n/gm,
    "",
  );
  next = next.replace(
    /^import \{[^\n]*keeperAssetSpriteStyle[^\n]*\} from "@\/lib\/arboreal-keeper-species";\n/gm,
    "",
  );
  const combinedImport = 'import { ARBOREAL_KEEPER_SPECIES_BY_ID, keeperAssetSpriteStyle } from "@/lib/arboreal-keeper-species";';
  if (!next.includes(combinedImport)) {
    const clientDirective = '"use client";';
    if (next.startsWith(clientDirective)) {
      next = next.replace(clientDirective, clientDirective + "\n\n" + combinedImport);
    } else {
      next = combinedImport + "\n" + next;
    }
  }
  if (next !== source) {
    fs.writeFileSync(marketPath, next);
    console.log("[keeper-art-guard] Normalized Emerald stable sprite imports.");
  }
}

const requiredFiles = [
  "public/hatchery/snakes/azurea.avif",
  "public/hatchery/snakes/pulcher.avif",
  "public/hatchery/snakes/utaraensis.avif",
  "public/hatchery/snakes/viridis.avif",
  "public/hatchery/snakes/neonates/azurea-red.webp",
  "public/hatchery/snakes/neonates/azurea-yellow.webp",
  "public/hatchery/snakes/neonates/pulcher-red.webp",
  "public/hatchery/snakes/neonates/pulcher-yellow.webp",
  "public/hatchery/snakes/neonates/utaraensis-red.webp",
  "public/hatchery/snakes/neonates/utaraensis-yellow.webp",
  "public/hatchery/snakes/neonates/viridis-yellow.webp",
  "public/hatchery/game/dock/home.webp",
  "public/hatchery/game/dock/breed.webp",
  "public/hatchery/game/dock/animals.webp",
  "public/hatchery/game/dock/offspring.webp",
  "public/hatchery/game/dock/store.webp",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`[keeper-art-guard] Missing required store/dock art: ${file}`);
  const size = fs.statSync(file).size;
  if (size < 2500) throw new Error(`[keeper-art-guard] Suspiciously small store/dock art (${size} bytes): ${file}`);
}


const juvenileWebps = [
  "public/hatchery/snakes/neonates/azurea-red.webp",
  "public/hatchery/snakes/neonates/azurea-yellow.webp",
  "public/hatchery/snakes/neonates/pulcher-red.webp",
  "public/hatchery/snakes/neonates/pulcher-yellow.webp",
  "public/hatchery/snakes/neonates/utaraensis-red.webp",
  "public/hatchery/snakes/neonates/utaraensis-yellow.webp",
  "public/hatchery/snakes/neonates/viridis-yellow.webp",
];
for (const file of juvenileWebps) {
  const bytes = fs.readFileSync(file);
  const signature = bytes.subarray(0, 12).toString("ascii");
  if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
    throw new Error(`[keeper-art-guard] Juvenile portrait is not a valid WebP: ${file}`);
  }
}

const yellowFiles = [
  "public/hatchery/snakes/neonates/azurea-yellow.webp",
  "public/hatchery/snakes/neonates/pulcher-yellow.webp",
  "public/hatchery/snakes/neonates/utaraensis-yellow.webp",
];
const hashes = yellowFiles.map((file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"));
if (new Set(hashes).size !== yellowFiles.length) {
  throw new Error("[keeper-art-guard] Yellow Azurea/Pulcher/Utaraensis juvenile portraits must be distinct files.");
}

const chondroIcon = fs.readFileSync("src/components/ChondroSnakeIcon.tsx", "utf8");
if (!chondroIcon.includes('lifeStage === "Hatchling" || lifeStage === "Neonate"')) {
  throw new Error("[keeper-art-guard] Chondro stage-aware portrait selector regressed.");
}
if (chondroIcon.includes("unavailableYellowJuvenileArt")) {
  throw new Error("[keeper-art-guard] Restored yellow juvenile portraits are still blocked by fallback logic.");
}

const chondroShop = fs.readFileSync("src/components/ChondroBreederExpandedShop.tsx", "utf8");
if (/traits=\{\{ highBlack: offer\.highBlack/.test(chondroShop)) {
  throw new Error("[keeper-art-guard] GTP store cards are still feeding trait artwork into listing portraits.");
}
if (!chondroShop.includes('"Morelia azurea azurea": ["Biak", "Numfor"]')) {
  throw new Error("[keeper-art-guard] Canonical GTP store locality mapping regressed.");
}

const emeraldMarket = fs.readFileSync(marketPath, "utf8");
const emeraldWorkspace = fs.readFileSync("src/components/ArborealKeeperEmeraldWorkspace.tsx", "utf8");
const emeraldEngine = fs.readFileSync("src/lib/arboreal-keeper-emerald-engine.ts", "utf8");

for (const file of [
  "public/hatchery/animals/emerald-tree-boas/northern/northern-sprite.webp",
  "public/hatchery/animals/emerald-tree-boas/amazon-basin/neonate-sprite.webp",
  "public/hatchery/animals/emerald-tree-boas/amazon-basin/later-sprite.webp",
]) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 5000) {
    throw new Error(`[keeper-art-guard] Missing Emerald stable sprite sheet: ${file}`);
  }
}
if (!emeraldMarket.includes("keeperAssetSpriteStyle(offer.animal.speciesId, legacyEmeraldAssetId(offer.animal))")) {
  throw new Error("[keeper-art-guard] Repti-Shop Emerald cards are not using stable stage sprites.");
}
if (emeraldMarket.includes("emeraldArtStyleForAnimal(")) {
  throw new Error("[keeper-art-guard] Corrupt Emerald V3 atlas renderer is still mounted in Repti-Shop.");
}
if (!emeraldWorkspace.includes("keeperAssetSpriteStyle(animal.speciesId, legacyEmeraldAssetId(animal))")) {
  throw new Error("[keeper-art-guard] Emerald collection cards are not using stable stage sprites.");
}
if (emeraldWorkspace.includes("emeraldArtStyleForAnimal(")) {
  throw new Error("[keeper-art-guard] Corrupt Emerald V3 atlas renderer is still mounted in My Animals.");
}
if (!emeraldEngine.includes("emeraldArtForAnimal")) {
  console.log("[keeper-art-guard] Emerald engine uses stable stored animal data without V3 art selection.");
}

const dock = fs.readFileSync("src/components/ChondroBreederWorkspace.tsx", "utf8");
for (const icon of ["home.webp", "breed.webp", "animals.webp", "offspring.webp", "store.webp"]) {
  if (!dock.includes(`/hatchery/game/dock/${icon}`)) {
    throw new Error(`[keeper-art-guard] Custom dock icon is not wired: ${icon}`);
  }
}
if (dock.includes("<ChondroBreederNavIcon")) {
  throw new Error("[keeper-art-guard] Legacy symbol dock icons are still mounted after the custom dock pass.");
}

console.log("[keeper-art-guard] Store art and the five custom Arboreal Keeper dock icons are wired and verified.");
