import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const marker = "// keeper-market-lock-context";

if (!fs.existsSync(marketPath)) {
  console.warn("[keeper-stabilize] Emerald market file missing; skipped generated-source stabilization.");
  process.exit(0);
}

let source = fs.readFileSync(marketPath, "utf8");
const usesLockContext =
  source.includes("disabled={locked") ||
  source.includes("{locked ?") ||
  source.includes("Unlocks Level {requiredLevel}");

if (usesLockContext && !source.includes(marker)) {
  const importLine = 'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";';
  if (!source.includes(importLine)) {
    const progressionImport = 'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";';
    if (!source.includes(progressionImport)) {
      throw new Error("[keeper-stabilize] Could not find the progression import anchor for Emerald market lock context.");
    }
    source = source.replace(progressionImport, `${progressionImport}\n${importLine}`);
  }

  const traitsAnchor = "                const traits = strongestTraits(offer.animal);";
  if (!source.includes(traitsAnchor)) {
    throw new Error("[keeper-stabilize] Could not find the Emerald market offer-card anchor for lock context.");
  }

  source = source.replace(
    traitsAnchor,
    `${traitsAnchor}\n                ${marker}\n                const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;\n                const locked = !offer.available;`,
  );
  fs.writeFileSync(marketPath, source);
  console.log("[keeper-stabilize] Restored missing Emerald market level-lock variables after legacy patch scripts.");
} else if (usesLockContext) {
  console.log("[keeper-stabilize] Emerald market level-lock context already stable.");
} else {
  console.log("[keeper-stabilize] No generated Emerald market lock context required.");
}
