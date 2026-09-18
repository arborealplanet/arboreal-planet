import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enginePath = path.join(root, "src/lib/arboreal-keeper-emerald-engine.ts");
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function update(filePath, transform, label) {
  if (!fs.existsSync(filePath)) throw new Error(`[emerald-art-v3] Missing ${path.relative(root, filePath)}`);
  const source = fs.readFileSync(filePath, "utf8");
  const next = transform(source);
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[emerald-art-v3] ${label}`);
  }
}

update(enginePath, (source) => {
  let next = source;

  if (!next.includes('from "@/lib/arboreal-keeper-emerald-art"')) {
    next = next.replace(
      '} from "@/lib/arboreal-keeper-species";',
      '} from "@/lib/arboreal-keeper-species";\nimport { emeraldArtForAnimal } from "@/lib/arboreal-keeper-emerald-art";',
    );
  }

  next = next
    .replace(/\n\s*assetsForStage,/, "")
    .replace(/\n\s*type KeeperAssetVariant,/, "");

  next = next.replace(
    /function assetForAnimal\([\s\S]*?\n}\n\nfunction randomNeonateColor/,
`function assetForAnimal(
  speciesId: EmeraldSpeciesId,
  lifeStage: KeeperLifeStage,
  phase: KeeperPhase,
  neonateColor: EmeraldNeonateColor | null,
  random: () => number,
) {
  return emeraldArtForAnimal(speciesId, lifeStage, phase, neonateColor, random);
}

function randomNeonateColor`,
  );

  next = next
    .replace('assetPath: asset?.path ?? null,', 'assetPath: null,')
    .replace('assetPath: asset?.path ?? animal.assetPath,', 'assetPath: null,');

  next = next.replace(
    /export function emeraldMarketForEpoch\(epoch: number, keeperLevel: number\): EmeraldMarketOffer\[\] \{[\s\S]*?\n}\n\nexport function emeraldMarketValue/,
`export function emeraldMarketForEpoch(epoch: number, keeperLevel: number): EmeraldMarketOffer[] {
  const random = seededRandom(epoch * 6151 + 1207);
  const marketSpecies = [
    "northern_emerald_tree_boa",
    "amazon_basin_emerald_tree_boa",
  ] as EmeraldSpeciesId[];

  return Array.from({ length: 8 }, (_, index) => {
    const speciesId = marketSpecies[index % marketSpecies.length] ?? marketSpecies[0];
    const stageRoll = random();
    const lifeStage: KeeperLifeStage = stageRoll < 0.28 ? "neonate" : stageRoll < 0.58 ? "subadult" : "adult";
    const phase = marketPhase(speciesId, random);
    const neonateColor = lifeStage === "neonate" ? randomNeonateColor(speciesId, phase, random) : null;
    const id = \`emerald-market-\${epoch}-\${speciesId}-\${index}\`;
    const animal = createEmeraldAnimal({
      id,
      speciesId,
      sex: random() < 0.5 ? "Male" : "Female",
      lifeStage,
      phase,
      neonateColor,
      traits: marketTraitSet(speciesId, random),
      condition: random() < 0.25 ? "Excellent" : "Good",
      random,
    });
    return {
      id,
      animal,
      price: emeraldMarketValue(animal),
      available: keeperLevel >= ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].unlockLevel,
    };
  });
}

export function emeraldMarketValue`,
  );

  const migrationHelper = `\nfunction migrateEmeraldAnimalArt(animal: EmeraldAnimal) {\n  const random = seededRandom(hashString(\`${'${animal.id}:${animal.lifeStage}:${animal.phase}:emerald-art-v3'}\`));\n  const asset = assetForAnimal(animal.speciesId, animal.lifeStage, animal.phase, animal.neonateColor, random);\n  return { ...animal, assetId: asset?.id ?? null, assetPath: null };\n}\n`;
  if (!next.includes("function migrateEmeraldAnimalArt")) {
    next = next.replace("export function sanitizeEmeraldKeeperSave", migrationHelper + "\nexport function sanitizeEmeraldKeeperSave");
  }
  next = next.replace(
    'animals: Array.isArray(input.animals) ? input.animals : [],',
    'animals: Array.isArray(input.animals) ? input.animals.map((animal) => migrateEmeraldAnimalArt(animal as EmeraldAnimal)) : [],',
  );

  if (!next.includes("emeraldArtForAnimal")) throw new Error("Engine V3 artwork import was not installed.");
  if (next.includes("assetsForStage(speciesId")) throw new Error("Legacy Emerald asset selection is still active.");
  return next;
}, "Wired Emerald generation, growth and save migration to V3 artwork.");

update(marketPath, (source) => {
  let next = source;

  const artImport = 'import { emeraldArtStyleForAnimal } from "@/lib/arboreal-keeper-emerald-art";';
  if (!next.includes(artImport)) {
    const anchor = 'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";';
    next = next.replace(anchor, `${anchor}\n${artImport}`);
  }

  const speciesImport = 'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";';
  if (!next.includes(speciesImport)) {
    next = next.replace(artImport, `${artImport}\n${speciesImport}`);
  }

  next = next
    .replace('const spriteStyle = keeperAssetSpriteStyle(offer.animal.speciesId, offer.animal.assetId);', 'const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);')
    .replace('const spriteStyle = emeraldSpriteStyle(offer.animal);', 'const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);');

  if (!next.includes('const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);')) {
    next = next.replace(
      '                const traits = strongestTraits(offer.animal);',
      '                const traits = strongestTraits(offer.animal);\n                const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);\n                const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;\n                const locked = !offer.available;',
    );
  } else {
    if (!next.includes('const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;')) {
      next = next.replace(
        '                const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);',
        '                const spriteStyle = emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId);\n                const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;\n                const locked = !offer.available;',
      );
    }
  }

  next = next.replace(
    /const showImage = Boolean\(offer\.animal\.assetPath[^;]*;/,
    'const showImage = Boolean(spriteStyle);',
  );

  if (!next.includes('if (!offer.available) {')) {
    next = next.replace(
      '    const offer = offers.find((item) => item.id === offerId);\n    if (!offer || purchased.has(offer.id) || busy) return;',
      '    const offer = offers.find((item) => item.id === offerId);\n    if (!offer || purchased.has(offer.id) || busy) return;\n    if (!offer.available) {\n      const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;\n      setStatus(emeraldSpeciesDisplayName(offer.animal.speciesId) + " unlocks at Keeper Level " + requiredLevel + ".");\n      return;\n    }',
    );
  }

  next = next.replace(
    /\{showImage \? \(\s*<Image[\s\S]*?\/>\s*\) : \(/,
`{showImage && spriteStyle ? (
                        <div
                          role="img"
                          aria-label={emeraldSpeciesDisplayName(offer.animal.speciesId) + " " + offer.animal.lifeStage}
                          className="absolute inset-0 rounded-2xl bg-black"
                          style={spriteStyle}
                        />
                      ) : (`,
  );

  next = next.replace(
    /\{showImage \? \(\s*spriteStyle \? \([\s\S]*?\) : \(\s*<Image[\s\S]*?\/>\s*\)\s*\) : \(/,
`{showImage && spriteStyle ? (
                        <div
                          role="img"
                          aria-label={emeraldSpeciesDisplayName(offer.animal.speciesId) + " " + offer.animal.lifeStage}
                          className="absolute inset-0 rounded-2xl bg-black"
                          style={spriteStyle}
                        />
                      ) : (`,
  );

  next = next.replace(/keeperAssetSpriteStyle\(offer\.animal\.speciesId, offer\.animal\.assetId\)/g, 'emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId)');

  if (!next.includes("Unlocks Level {requiredLevel}")) {
    next = next.replace(
      '<div className="flex flex-wrap gap-1.5">\n                        {offer.animal.phase === "anaconda" ? (',
      '<div className="flex flex-wrap gap-1.5">\n                        {locked ? (\n                          <span className="rounded-full border border-amber-200/15 bg-amber-200/[.05] px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] text-amber-100/70">Unlocks Level {requiredLevel}</span>\n                        ) : null}\n                        {offer.animal.phase === "anaconda" ? (',
    );
  }

  next = next.replace(
    'disabled={sold || busy !== null || cash < offer.price || housing <= 0}',
    'disabled={locked || sold || busy !== null || cash < offer.price || housing <= 0}',
  );
  next = next.replace(
    '{sold ? "Purchased" : housing <= 0 ? "Need space" : cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}',
    '{locked ? "Level " + requiredLevel : sold ? "Purchased" : housing <= 0 ? "Need space" : cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}',
  );

  if (!next.includes("emeraldArtStyleForAnimal(offer.animal.speciesId, offer.animal.lifeStage, offer.animal.phase, offer.animal.neonateColor, offer.animal.assetId)")) throw new Error("Market V3 sprite style was not installed.");
  if (!next.includes("const locked = !offer.available;")) throw new Error("Market V3 lock state was not installed.");
  return next;
}, "Switched Repti-Shop Emerald cards to the V3 user-supplied atlas.");

update(workspacePath, (source) => {
  let next = source;
  const artImport = 'import { emeraldArtStyleForAnimal } from "@/lib/arboreal-keeper-emerald-art";';
  next = next.replace('import { emeraldArtStyle } from "@/lib/arboreal-keeper-emerald-art";', artImport);
  if (!next.includes(artImport)) {
    const anchor = 'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";';
    next = next.replace(anchor, `${anchor}\n${artImport}`);
  }

  const portrait = `function EmeraldPortrait({ animal, failed, onFail }: { animal: EmeraldAnimal; failed: boolean; onFail: () => void }) {
  const spriteStyle = emeraldArtStyleForAnimal(animal.speciesId, animal.lifeStage, animal.phase, animal.neonateColor, animal.assetId);
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-white/[.055] bg-[radial-gradient(circle_at_50%_38%,rgba(52,211,153,.12),transparent_42%),#020605]">
      {spriteStyle && !failed ? (
        <div
          role="img"
          aria-label={emeraldSpeciesDisplayName(animal.speciesId) + " game asset"}
          className="absolute inset-0 bg-black"
          style={spriteStyle}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center p-5 text-center">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/10 bg-emerald-300/[.04] text-2xl text-emerald-100/40">◆</div>
            <div className="mt-3 text-[10px] font-black uppercase tracking-[.15em] text-white/30">Asset unavailable</div>
            <div className="mt-1 text-xs text-white/22">{animal.assetId ?? "Emerald artwork unavailable"}</div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}`;

  next = next.replace(/function EmeraldPortrait\([\s\S]*?\n}\n\nfunction EmptyState/, portrait + "\n\nfunction EmptyState");
  if (!next.includes("emeraldArtStyleForAnimal(animal.speciesId, animal.lifeStage, animal.phase, animal.neonateColor, animal.assetId)")) throw new Error("Workspace V3 portrait was not installed.");
  return next;
}, "Switched My Animals and breeding portraits to the V3 user-supplied atlas.");

console.log("Applied final Emerald Tree Boa V3 artwork pass.");
