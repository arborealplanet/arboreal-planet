import fs from "node:fs";
import crypto from "node:crypto";

const marketPath = "src/components/ArborealKeeperEmeraldMarketBar.tsx";
if (fs.existsSync(marketPath)) {
  const source = fs.readFileSync(marketPath, "utf8");
  let next = source;

  // The canonical source may still import the legacy sprite helper alongside the
  // species registry. V3 owns rendering now, so normalize this to a single registry
  // import after the V3 transform instead of allowing duplicate symbol imports.
  next = next.replace(
    'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";\nimport { ARBOREAL_KEEPER_SPECIES_BY_ID, keeperAssetSpriteStyle } from "@/lib/arboreal-keeper-species";',
    'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";',
  );
  next = next.replace(
    'import { ARBOREAL_KEEPER_SPECIES_BY_ID, keeperAssetSpriteStyle } from "@/lib/arboreal-keeper-species";',
    'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";',
  );

  if (next !== source) {
    fs.writeFileSync(marketPath, next);
    console.log("[keeper-art-guard] Normalized Emerald V3 imports.");
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
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`[keeper-art-guard] Missing required store art: ${file}`);
  const size = fs.statSync(file).size;
  if (size < 5000) throw new Error(`[keeper-art-guard] Suspiciously small store art (${size} bytes): ${file}`);
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

const emeraldHelper = fs.readFileSync("src/lib/arboreal-keeper-emerald-art.ts", "utf8");
if (!emeraldHelper.includes("data:image/webp;base64,UklGR")) {
  throw new Error("[keeper-art-guard] Emerald V3 helper does not contain the preserved user-supplied atlas.");
}
if (!emeraldHelper.includes('weight: 6') || !emeraldHelper.includes('weight: 47')) {
  throw new Error("[keeper-art-guard] Northern Emerald adult 6/47/47 art weighting is missing.");
}
if (!emeraldHelper.includes('etb-northern-anaconda-subadult-v3')) {
  throw new Error("[keeper-art-guard] Northern Anaconda neonate-through-subadult art rule is missing.");
}

const emeraldMarket = fs.readFileSync(marketPath, "utf8");
const emeraldEngine = fs.readFileSync("src/lib/arboreal-keeper-emerald-engine.ts", "utf8");
if (!emeraldMarket.includes("emeraldArtStyle(offer.animal.assetId)")) {
  throw new Error("[keeper-art-guard] Repti-Shop Emerald cards are not using the V3 art renderer after prebuild.");
}
if (!emeraldMarket.includes("const locked = !offer.available;")) {
  throw new Error("[keeper-art-guard] Repti-Shop Emerald level-lock state is missing after prebuild.");
}
if (!emeraldEngine.includes("emeraldArtForAnimal")) {
  throw new Error("[keeper-art-guard] Emerald generation is not using the V3 art selector after prebuild.");
}

console.log("[keeper-art-guard] Store art verified: Chondro portraits are distinct and Emerald V3 rendering is active.");
