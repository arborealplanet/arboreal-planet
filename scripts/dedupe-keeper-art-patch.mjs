import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src/components/ArborealKeeperEmeraldMarketBar.tsx");

if (!fs.existsSync(filePath)) process.exit(0);

const source = fs.readFileSync(filePath, "utf8");
const marker = '                const showImage = Boolean(offer.animal.assetPath) && !brokenAssets.includes(offer.animal.assetPath ?? "");\n';
const start = source.indexOf(marker);
if (start < 0) process.exit(0);

const returnIndex = source.indexOf("                return (\n", start);
if (returnIndex < 0) process.exit(0);

const before = source.slice(0, start);
const after = source.slice(returnIndex);
const canonical =
  marker +
  '                const spriteStyle = emeraldSpriteStyle(offer.animal);\n' +
  '                const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;\n' +
  '                const locked = !offer.available;\n';

const next = before + canonical + after;
if (next !== source) {
  fs.writeFileSync(filePath, next);
  console.log("[keeper-art] Normalized Emerald market sprite/lock declarations for repeatable builds.");
}
