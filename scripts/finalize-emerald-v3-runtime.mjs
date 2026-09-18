import fs from "node:fs";

const marketPath = "src/components/ArborealKeeperEmeraldMarketBar.tsx";
const workspacePath = "src/components/ArborealKeeperEmeraldWorkspace.tsx";

function writeIfChanged(path, source, next) {
  if (next !== source) {
    fs.writeFileSync(path, next);
    console.log("[emerald-v3-final] Normalized " + path);
  }
}

function normalizeMarket() {
  if (!fs.existsSync(marketPath)) return;
  const source = fs.readFileSync(marketPath, "utf8");
  let next = source;

  next = next.replace(
    /^import \{[^\n]*emeraldArtStyleForAnimal[^\n]*\} from "@\/lib\/arboreal-keeper-emerald-art";\n/gm,
    "",
  );
  next = next.replace(
    /^import \{[^\n]*(?:ARBOREAL_KEEPER_SPECIES_BY_ID|keeperAssetSpriteStyle)[^\n]*\} from "@\/lib\/arboreal-keeper-species";\n/gm,
    "",
  );

  const progressionImport = 'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";';
  const artImport = 'import { emeraldArtStyleForAnimal } from "@/lib/arboreal-keeper-emerald-art";';
  const speciesImport = 'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";';

  if (!next.includes(artImport)) {
    next = next.replace(progressionImport, progressionImport + "\n" + artImport + "\n" + speciesImport);
  } else if (!next.includes(speciesImport)) {
    next = next.replace(artImport, artImport + "\n" + speciesImport);
  }

  next = next.replace(
    /const spriteStyle = keeperAssetSpriteStyle\([^;]+\);/g,
    'const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);',
  );

  next = next.replace(
    /\nfunction legacyEmeraldAssetId\([\s\S]*?\n}\n\nexport function ArborealKeeperEmeraldMarketBar/,
    "\nexport function ArborealKeeperEmeraldMarketBar",
  );

  if (!next.includes("emeraldArtStyleForAnimal(offer.animal.speciesId")) {
    throw new Error("[emerald-v3-final] Could not enforce V3 renderer in Repti-Shop.");
  }
  if (next.includes("keeperAssetSpriteStyle(offer.animal.speciesId")) {
    throw new Error("[emerald-v3-final] Legacy Emerald renderer survived in Repti-Shop.");
  }

  writeIfChanged(marketPath, source, next);
}

function normalizeWorkspace() {
  if (!fs.existsSync(workspacePath)) return;
  const source = fs.readFileSync(workspacePath, "utf8");
  let next = source;

  next = next.replace(
    /^import \{[^\n]*emeraldArtStyleForAnimal[^\n]*\} from "@\/lib\/arboreal-keeper-emerald-art";\n/gm,
    "",
  );
  next = next.replace(
    /^import \{[^\n]*(?:ARBOREAL_KEEPER_SPECIES_BY_ID|keeperAssetSpriteStyle)[^\n]*\} from "@\/lib\/arboreal-keeper-species";\n/gm,
    "",
  );

  const progressionImport = 'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";';
  const artImport = 'import { emeraldArtStyleForAnimal } from "@/lib/arboreal-keeper-emerald-art";';
  const speciesImport = 'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";';

  if (!next.includes(artImport)) {
    next = next.replace(progressionImport, progressionImport + "\n" + artImport + "\n" + speciesImport);
  } else if (!next.includes(speciesImport)) {
    next = next.replace(artImport, artImport + "\n" + speciesImport);
  }

  next = next.replace(
    /const spriteStyle = keeperAssetSpriteStyle\([^;]+\);/g,
    'const spriteStyle = emeraldArtStyleForAnimal(animal.speciesId, animal.lifeStage, animal.phase, animal.neonateColor, animal.assetId);',
  );

  next = next.replace(
    /\nfunction legacyEmeraldAssetId\([\s\S]*?\n}\n\nfunction EmeraldPortrait/,
    "\nfunction EmeraldPortrait",
  );

  if (!next.includes("emeraldArtStyleForAnimal(animal.speciesId")) {
    throw new Error("[emerald-v3-final] Could not enforce V3 renderer in My Animals.");
  }
  if (next.includes("keeperAssetSpriteStyle(animal.speciesId")) {
    throw new Error("[emerald-v3-final] Legacy Emerald renderer survived in My Animals.");
  }

  writeIfChanged(workspacePath, source, next);
}

normalizeMarket();
normalizeWorkspace();
