import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const speciesPath = path.join(root, "src/lib/arboreal-keeper-species.ts");
const enginePath = path.join(root, "src/lib/arboreal-keeper-emerald-engine.ts");
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");
const spritePath = "/hatchery/animals/emerald-tree-boas/amazon-basin/basin-sprite.webp";

function writeIfChanged(filePath, source, next, label) {
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[keeper-boa-visibility] ${label}`);
  }
}

if (fs.existsSync(speciesPath)) {
  const source = fs.readFileSync(speciesPath, "utf8");
  let next = source;
  next = next.replace(
    'path: `/hatchery/animals/emerald-tree-boas/amazon-basin/subadult/${String(index + 1).padStart(2, "0")}.png`,',
    `path: "${spritePath}",`,
  );
  next = next.replace(
    'path: `/hatchery/animals/emerald-tree-boas/amazon-basin/adult/${String(index + 1).padStart(2, "0")}.png`,',
    `path: "${spritePath}",`,
  );
  writeIfChanged(speciesPath, source, next, "Wired the six approved Basin subadult/adult variants to the Basin sprite.");
}

if (fs.existsSync(enginePath)) {
  const source = fs.readFileSync(enginePath, "utf8");
  let next = source;
  next = next.replace(
`  const availableSpecies = ([
    "northern_emerald_tree_boa",
    "amazon_basin_emerald_tree_boa",
  ] as EmeraldSpeciesId[]).filter(
    (speciesId) => keeperLevel >= ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].unlockLevel,
  );

  if (!availableSpecies.length) return [];

  return Array.from({ length: 8 }, (_, index) => {
    const speciesId = availableSpecies[index % availableSpecies.length] ?? availableSpecies[0];`,
`  const marketSpecies = [
    "northern_emerald_tree_boa",
    "amazon_basin_emerald_tree_boa",
  ] as EmeraldSpeciesId[];

  return Array.from({ length: 8 }, (_, index) => {
    const speciesId = marketSpecies[index % marketSpecies.length] ?? marketSpecies[0];`,
  );
  next = next.replace(
`      available: true,
    };
  });
}`,
`      available: keeperLevel >= ARBOREAL_KEEPER_SPECIES_BY_ID[speciesId].unlockLevel,
    };
  });
}`,
  );
  writeIfChanged(enginePath, source, next, "Kept locked Emerald Tree Boa listings visible instead of hiding the entire boa market.");
}

const spriteHelpers = `
const BASIN_SPRITE_POSITIONS: Record<string, string> = {
  etb_basin_subadult_01: "0% 0%",
  etb_basin_subadult_02: "50% 0%",
  etb_basin_subadult_03: "100% 0%",
  etb_basin_adult_01: "0% 100%",
  etb_basin_adult_02: "50% 100%",
  etb_basin_adult_03: "100% 100%",
};

function basinSpritePosition(animal: EmeraldAnimal) {
  if (animal.speciesId !== "amazon_basin_emerald_tree_boa" || !animal.assetId) return null;
  return BASIN_SPRITE_POSITIONS[animal.assetId] ?? null;
}
`;

if (fs.existsSync(marketPath)) {
  const source = fs.readFileSync(marketPath, "utf8");
  let next = source;
  if (!next.includes("const BASIN_SPRITE_POSITIONS")) {
    next = next.replace("function compatibleEmptyHousingCount", `${spriteHelpers}\nfunction compatibleEmptyHousingCount`);
  }
  next = next.replace(
`    const offer = offers.find((item) => item.id === offerId);
    if (!offer || purchased.has(offer.id) || busy) return;`,
`    const offer = offers.find((item) => item.id === offerId);
    if (!offer || purchased.has(offer.id) || busy) return;
    if (!offer.available) {
      const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;
      setStatus(`${'${'}emeraldSpeciesDisplayName(offer.animal.speciesId)} unlocks at Keeper Level ${'${'}requiredLevel}.`);
      return;
    }`,
  );
  if (!next.includes('ARBOREAL_KEEPER_SPECIES_BY_ID')) {
    next = next.replace(
      'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";',
      'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";\nimport { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";',
    );
  }
  next = next.replace(
`                const traits = strongestTraits(offer.animal);
                const showImage = Boolean(offer.animal.assetPath) && !brokenAssets.includes(offer.animal.assetPath ?? "");`,
`                const traits = strongestTraits(offer.animal);
                const showImage = Boolean(offer.animal.assetPath) && !brokenAssets.includes(offer.animal.assetPath ?? "");
                const spritePosition = basinSpritePosition(offer.animal);
                const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;
                const locked = !offer.available;`,
  );
  next = next.replace(
`                      {showImage ? (
                        <Image
                          src={offer.animal.assetPath!}
                          alt={`${'${'}emeraldSpeciesDisplayName(offer.animal.speciesId)} ${'${'}offer.animal.lifeStage}`}
                          fill
                          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 33vw"
                          className="object-contain p-2"
                          onError={() => setBrokenAssets((current) => current.includes(offer.animal.assetPath!) ? current : [...current, offer.animal.assetPath!])}
                        />
                      ) : (`,
`                      {showImage ? (
                        spritePosition ? (
                          <div
                            role="img"
                            aria-label={`${'${'}emeraldSpeciesDisplayName(offer.animal.speciesId)} ${'${'}offer.animal.lifeStage}`}
                            className="absolute inset-2 rounded-xl bg-black bg-no-repeat"
                            style={{
                              backgroundImage: `url("${'${'}offer.animal.assetPath}")`,
                              backgroundSize: "300% 200%",
                              backgroundPosition: spritePosition,
                            }}
                          />
                        ) : (
                          <Image
                            src={offer.animal.assetPath!}
                            alt={`${'${'}emeraldSpeciesDisplayName(offer.animal.speciesId)} ${'${'}offer.animal.lifeStage}`}
                            fill
                            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 33vw"
                            className="object-contain p-2"
                            onError={() => setBrokenAssets((current) => current.includes(offer.animal.assetPath!) ? current : [...current, offer.animal.assetPath!])}
                          />
                        )
                      ) : (`,
  );
  next = next.replace(
`                      <div className="flex flex-wrap gap-1.5">
                        {offer.animal.phase === "anaconda" ? (`,
`                      <div className="flex flex-wrap gap-1.5">
                        {locked ? (
                          <span className="rounded-full border border-amber-200/15 bg-amber-200/[.05] px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] text-amber-100/70">Unlocks Level {requiredLevel}</span>
                        ) : null}
                        {offer.animal.phase === "anaconda" ? (`,
  );
  next = next.replace(
`                          disabled={sold || busy !== null || cash < offer.price || housing <= 0}`,
`                          disabled={locked || sold || busy !== null || cash < offer.price || housing <= 0}`,
  );
  next = next.replace(
`                          {sold ? "Purchased" : housing <= 0 ? "Need space" : cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}`,
`                          {locked ? `Level ${'${'}requiredLevel}` : sold ? "Purchased" : housing <= 0 ? "Need space" : cash < offer.price ? "Need cash" : busy === offer.id ? "Buying…" : "Buy"}`,
  );
  writeIfChanged(marketPath, source, next, "Added Basin sprite rendering and visible Keeper Level locks to the Emerald market bar.");
}

if (fs.existsSync(workspacePath)) {
  const source = fs.readFileSync(workspacePath, "utf8");
  let next = source;
  if (!next.includes("const BASIN_SPRITE_POSITIONS")) {
    next = next.replace("type EconomyAction =", `${spriteHelpers}\ntype EconomyAction =`);
  }
  next = next.replace(
`function EmeraldPortrait({ animal, failed, onFail }: { animal: EmeraldAnimal; failed: boolean; onFail: () => void }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-white/[.055] bg-[radial-gradient(circle_at_50%_38%,rgba(52,211,153,.12),transparent_42%),#020605]">
      {animal.assetPath && !failed ? (
        <Image
          src={animal.assetPath}
          alt={`${'${'}emeraldSpeciesDisplayName(animal.speciesId)} game asset`}
          fill
          sizes="(max-width: 768px) 90vw, 320px"
          className="object-contain p-1"
          onError={onFail}
        />
      ) : (`,
`function EmeraldPortrait({ animal, failed, onFail }: { animal: EmeraldAnimal; failed: boolean; onFail: () => void }) {
  const spritePosition = basinSpritePosition(animal);
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-white/[.055] bg-[radial-gradient(circle_at_50%_38%,rgba(52,211,153,.12),transparent_42%),#020605]">
      {animal.assetPath && !failed ? (
        spritePosition ? (
          <div
            role="img"
            aria-label={`${'${'}emeraldSpeciesDisplayName(animal.speciesId)} game asset`}
            className="absolute inset-1 rounded-[16px] bg-black bg-no-repeat"
            style={{
              backgroundImage: `url("${'${'}animal.assetPath}")`,
              backgroundSize: "300% 200%",
              backgroundPosition: spritePosition,
            }}
          />
        ) : (
          <Image
            src={animal.assetPath}
            alt={`${'${'}emeraldSpeciesDisplayName(animal.speciesId)} game asset`}
            fill
            sizes="(max-width: 768px) 90vw, 320px"
            className="object-contain p-1"
            onError={onFail}
          />
        )
      ) : (`,
  );
  writeIfChanged(workspacePath, source, next, "Added Basin sprite rendering to Emerald collection/breeding portraits.");
}
