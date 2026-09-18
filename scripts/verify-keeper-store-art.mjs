import fs from "node:fs";
import crypto from "node:crypto";

const atlasPath = "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";
const atlasExpectedBytes = 196492;
const atlasExpectedHash = "62644f94c24ff408c6af5e639c1d581207a01c089cfca041f65f5e7a24a87af0";

const requiredFiles = [
  "public/hatchery/snakes/azurea.avif",
  "public/hatchery/snakes/pulcher.avif",
  "public/hatchery/snakes/utaraensis.avif",
  "public/hatchery/snakes/viridis.avif",
  "public/hatchery/snakes/game-base/azurea.webp",
  "public/hatchery/snakes/game-base/pulcher.webp",
  "public/hatchery/snakes/game-base/utaraensis.webp",
  "public/hatchery/snakes/game-base/viridis.webp",
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
  atlasPath,
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`[keeper-art-guard] Missing required game art: ${file}`);
  const size = fs.statSync(file).size;
  if (size < 2500) throw new Error(`[keeper-art-guard] Suspiciously small game art (${size} bytes): ${file}`);
}

const atlas = fs.readFileSync(atlasPath);
const atlasHash = crypto.createHash("sha256").update(atlas).digest("hex");
if (atlas.length !== atlasExpectedBytes) {
  throw new Error(`[keeper-art-guard] Emerald V3 atlas size mismatch: ${atlas.length}`);
}
if (atlasHash !== atlasExpectedHash) {
  throw new Error(`[keeper-art-guard] Emerald V3 atlas hash mismatch: ${atlasHash}`);
}
if (atlas.subarray(0, 4).toString("ascii") !== "RIFF" || atlas.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("[keeper-art-guard] Emerald V3 atlas is not a WebP RIFF container.");
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
    throw new Error(`[keeper-art-guard] Juvenile portrait is not a WebP: ${file}`);
  }
}

const yellowFiles = [
  "public/hatchery/snakes/neonates/azurea-yellow.webp",
  "public/hatchery/snakes/neonates/pulcher-yellow.webp",
  "public/hatchery/snakes/neonates/utaraensis-yellow.webp",
];
const yellowHashes = yellowFiles.map((file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
);
if (new Set(yellowHashes).size !== yellowFiles.length) {
  throw new Error("[keeper-art-guard] Yellow Azurea/Pulcher/Utaraensis portraits must remain distinct.");
}

const chondroIcon = fs.readFileSync("src/components/ChondroSnakeIcon.tsx", "utf8");
if (!chondroIcon.includes('lifeStage === "Hatchling" || lifeStage === "Neonate" || lifeStage === "Subadult"')) {
  throw new Error("[keeper-art-guard] GTP juvenile-through-Subadult art rule regressed.");
}
if (!chondroIcon.includes("/hatchery/snakes/game-base/azurea.webp")) {
  throw new Error("[keeper-art-guard] Approved GTP base game sprites are no longer wired.");
}

const chondroShop = fs.readFileSync("src/components/ChondroBreederExpandedShop.tsx", "utf8");
if (/traits=\{\{ highBlack: offer\.highBlack/.test(chondroShop)) {
  throw new Error("[keeper-art-guard] GTP store is feeding trait art into ordinary listings.");
}
if (!chondroShop.includes('"Morelia azurea azurea": ["Biak", "Numfor"]') ||
    !chondroShop.includes('"Morelia azurea utaraensis": ["Cyclops", "Jayapura", "Lereh", "Wamena", "Yapen"]') ||
    !chondroShop.includes('"Morelia viridis": ["Aru", "Merauke"]')) {
  throw new Error("[keeper-art-guard] Canonical GTP locality mapping regressed.");
}

const emeraldHelper = fs.readFileSync("src/lib/arboreal-keeper-emerald-art.ts", "utf8");
const emeraldMarket = fs.readFileSync("src/components/ArborealKeeperEmeraldMarketBar.tsx", "utf8");
const emeraldWorkspace = fs.readFileSync("src/components/ArborealKeeperEmeraldWorkspace.tsx", "utf8");
const emeraldEngine = fs.readFileSync("src/lib/arboreal-keeper-emerald-engine.ts", "utf8");

if (!emeraldHelper.includes('const EMERALD_ATLAS = "/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";')) {
  throw new Error("[keeper-art-guard] Emerald helper is not pointed at the verified public V3 atlas.");
}
if (emeraldHelper.includes("data:image/webp;base64,")) {
  throw new Error("[keeper-art-guard] Corrupt embedded Emerald atlas data returned.");
}
if (emeraldHelper.includes("etb-northern-neonate-green-01-v3")) {
  throw new Error("[keeper-art-guard] Green Northern standard neonate slot returned; green juvenile art is Anaconda-only.");
}
if (!emeraldHelper.includes('id: "etb-northern-anaconda-subadult-v3"') ||
    !emeraldHelper.includes('stage: "subadult", phase: "anaconda", cell: 2')) {
  throw new Error("[keeper-art-guard] Northern Anaconda juvenile/subadult mapping regressed.");
}
for (const marker of ["weight: 6", "weight: 47"]) {
  if (!emeraldHelper.includes(marker)) throw new Error(`[keeper-art-guard] Northern adult weighting missing: ${marker}`);
}
for (const marker of [
  "etb-basin-neonate-05-v3",
  "etb-basin-subadult-02-v3",
  "etb-basin-adult-03-v3",
]) {
  if (!emeraldHelper.includes(marker)) throw new Error(`[keeper-art-guard] Emerald V3 mapping missing: ${marker}`);
}
if (!emeraldMarket.includes("emeraldArtStyleForAnimal(offer.animal.speciesId")) {
  throw new Error("[keeper-art-guard] Repti-Shop Emerald cards are not using the V3 atlas renderer.");
}
if (emeraldMarket.includes("keeperAssetSpriteStyle(offer.animal.speciesId")) {
  throw new Error("[keeper-art-guard] Broken legacy Emerald sprite-sheet renderer returned to Repti-Shop.");
}
if (!emeraldWorkspace.includes("emeraldArtStyleForAnimal(animal.speciesId")) {
  throw new Error("[keeper-art-guard] My Animals Emerald portraits are not using the V3 atlas renderer.");
}
if (emeraldWorkspace.includes("keeperAssetSpriteStyle(animal.speciesId")) {
  throw new Error("[keeper-art-guard] Broken legacy Emerald sprite-sheet renderer returned to My Animals.");
}
if (!emeraldEngine.includes("emeraldArtForAnimal(") ||
    !emeraldEngine.includes('EMERALD_V3_ATLAS_PATH = "/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp"')) {
  throw new Error("[keeper-art-guard] Emerald engine is not assigning V3 art IDs/paths.");
}

const dock = fs.readFileSync("src/components/ChondroBreederWorkspace.tsx", "utf8");
for (const icon of ["home.webp", "breed.webp", "animals.webp", "offspring.webp", "store.webp"]) {
  if (!dock.includes(`/hatchery/game/dock/${icon}`)) {
    throw new Error(`[keeper-art-guard] Custom dock icon is not wired: ${icon}`);
  }
}
if (dock.includes("<ChondroBreederNavIcon")) {
  throw new Error("[keeper-art-guard] Legacy symbol dock icons are mounted.");
}

console.log(`[keeper-art-guard] Verified GTP sprites, canonical localities, dock icons, and Emerald V3 atlas ${atlasHash}.`);
