import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const speciesPath = path.join(root, "src/lib/arboreal-keeper-species.ts");
const enginePath = path.join(root, "src/lib/arboreal-keeper-emerald-engine.ts");
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

const northernSprite = "/hatchery/animals/emerald-tree-boas/northern/northern-sprite.webp";
const basinNeonateSprite = "/hatchery/animals/emerald-tree-boas/amazon-basin/neonate-sprite.webp";
const basinLaterSprite = "/hatchery/animals/emerald-tree-boas/amazon-basin/later-sprite.webp";

function update(filePath, transform, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[keeper-art] Missing ${path.relative(root, filePath)}; skipped ${label}.`);
    return;
  }
  const source = fs.readFileSync(filePath, "utf8");
  const next = transform(source);
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[keeper-art] ${label}`);
  }
}

update(speciesPath, (source) => {
  let next = source;
  const northernPaths = [
    "/hatchery/animals/emerald-tree-boas/northern/neonate/red-01.png",
    "/hatchery/animals/emerald-tree-boas/northern/neonate/green-01.png",
    "/hatchery/animals/emerald-tree-boas/northern/neonate/anaconda-green-01.png",
    "/hatchery/animals/emerald-tree-boas/northern/subadult/standard-01.png",
    "/hatchery/animals/emerald-tree-boas/northern/adult/standard-01.png",
    "/hatchery/animals/emerald-tree-boas/northern/adult/standard-02.png",
    "/hatchery/animals/emerald-tree-boas/northern/adult/standard-03.png",
    "/hatchery/animals/emerald-tree-boas/northern/adult/anaconda-01.png",
  ];
  for (const deadPath of northernPaths) next = next.split(deadPath).join(northernSprite);
  next = next.replace(
    'path: `/hatchery/animals/emerald-tree-boas/amazon-basin/neonate/${String(index + 1).padStart(2, "0")}.png`,',
    `path: "${basinNeonateSprite}",`,
  );
  next = next.replace(
    'path: `/hatchery/animals/emerald-tree-boas/amazon-basin/subadult/${String(index + 1).padStart(2, "0")}.png`,',
    `path: "${basinLaterSprite}",`,
  );
  next = next.replace(
    'path: `/hatchery/animals/emerald-tree-boas/amazon-basin/adult/${String(index + 1).padStart(2, "0")}.png`,',
    `path: "${basinLaterSprite}",`,
  );
  return next;
}, "Replaced dead Emerald PNG paths with committed WebP sprites.");

update(enginePath, (source) => {
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
    const speciesId = availableSpecies[index % availableSpecies.length] ?? availableSpecies[0];
    const lifeStage: KeeperLifeStage = random() < 0.68 ? "adult" : "subadult";
    const phase = marketPhase(speciesId, random);
    const neonateColor = null;`,
`  const marketSpecies = [
    "northern_emerald_tree_boa",
    "amazon_basin_emerald_tree_boa",
  ] as EmeraldSpeciesId[];

  return Array.from({ length: 8 }, (_, index) => {
    const speciesId = marketSpecies[index % marketSpecies.length] ?? marketSpecies[0];
    const stageRoll = random();
    const lifeStage: KeeperLifeStage = stageRoll < 0.28 ? "neonate" : stageRoll < 0.58 ? "subadult" : "adult";
    const phase = marketPhase(speciesId, random);
    const neonateColor = lifeStage === "neonate" ? randomNeonateColor(speciesId, phase, random) : null;`,
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
  return next;
}, "Made Northern/Basin listings visible before unlock and added neonates to market rotation.");

const spriteHelper = `
function emeraldSpriteStyle(animal: EmeraldAnimal): React.CSSProperties | null {
  const id = animal.assetId ?? "";
  let columns = 1;
  let rows = 1;
  let column = 0;
  let row = 0;

  if (id.startsWith("etb_northern_")) {
    const order = [
      "etb_northern_neonate_red_01",
      "etb_northern_neonate_green_01",
      "etb_northern_neonate_anaconda_01",
      "etb_northern_subadult_01",
      "etb_northern_adult_standard_01",
      "etb_northern_adult_standard_02",
      "etb_northern_adult_standard_03",
      "etb_northern_adult_anaconda_01",
    ];
    const index = order.indexOf(id);
    if (index < 0) return null;
    columns = 4;
    rows = 2;
    column = index % columns;
    row = Math.floor(index / columns);
  } else if (id.startsWith("etb_basin_neonate_")) {
    const index = Number(id.slice(-2)) - 1;
    if (!Number.isFinite(index) || index < 0 || index > 5) return null;
    columns = 3;
    rows = 2;
    column = index % columns;
    row = Math.floor(index / columns);
  } else if (id.startsWith("etb_basin_subadult_")) {
    const index = Number(id.slice(-2)) - 1;
    if (!Number.isFinite(index) || index < 0 || index > 2) return null;
    columns = 3;
    rows = 2;
    column = index;
    row = 0;
  } else if (id.startsWith("etb_basin_adult_")) {
    const index = Number(id.slice(-2)) - 1;
    if (!Number.isFinite(index) || index < 0 || index > 2) return null;
    columns = 3;
    rows = 2;
    column = index;
    row = 1;
  } else {
    return null;
  }

  const x = columns === 1 ? 0 : (column / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  return {
    backgroundImage: 'url("' + animal.assetPath + '")',
    backgroundRepeat: "no-repeat",
    backgroundSize: String(columns * 100) + "% " + String(rows * 100) + "%",
    backgroundPosition: String(x) + "% " + String(y) + "%",
  };
}
`;

update(marketPath, (source) => {
  let next = source;
  const speciesImport = 'import { ARBOREAL_KEEPER_SPECIES_BY_ID } from "@/lib/arboreal-keeper-species";';
  if (!next.includes(speciesImport)) {
    next = next.replace(
      'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";',
      'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";\n' + speciesImport,
    );
  }
  if (!next.includes("function emeraldSpriteStyle")) {
    next = next.replace("function compatibleEmptyHousingCount", spriteHelper + "\nfunction compatibleEmptyHousingCount");
  }
  next = next.replace(
`    const offer = offers.find((item) => item.id === offerId);
    if (!offer || purchased.has(offer.id) || busy) return;`,
`    const offer = offers.find((item) => item.id === offerId);
    if (!offer || purchased.has(offer.id) || busy) return;
    if (!offer.available) {
      const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;
      setStatus(emeraldSpeciesDisplayName(offer.animal.speciesId) + " unlocks at Keeper Level " + requiredLevel + ".");
      return;
    }`,
  );
  next = next.replace(
`                const traits = strongestTraits(offer.animal);
                const showImage = Boolean(offer.animal.assetPath) && !brokenAssets.includes(offer.animal.assetPath ?? "");`,
`                const traits = strongestTraits(offer.animal);
                const showImage = Boolean(offer.animal.assetPath) && !brokenAssets.includes(offer.animal.assetPath ?? "");
                const spriteStyle = emeraldSpriteStyle(offer.animal);
                const requiredLevel = ARBOREAL_KEEPER_SPECIES_BY_ID[offer.animal.speciesId].unlockLevel;
                const locked = !offer.available;`,
  );

  if (!next.includes('style={spriteStyle}')) {
    next = next.replace(
      /\{showImage \? \(\s*<Image[\s\S]*?\/>\s*\) : \(/,
`{showImage ? (
                        spriteStyle ? (
                          <div
                            role="img"
                            aria-label={emeraldSpeciesDisplayName(offer.animal.speciesId) + " " + offer.animal.lifeStage}
                            className="absolute inset-2 rounded-xl bg-black"
                            style={spriteStyle}
                          />
                        ) : (
                          <Image
                            src={offer.animal.assetPath!}
                            alt={emeraldSpeciesDisplayName(offer.animal.speciesId) + " " + offer.animal.lifeStage}
                            fill
                            sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 33vw"
                            className="object-contain p-2"
                            onError={() => setBrokenAssets((current) => current.includes(offer.animal.assetPath!) ? current : [...current, offer.animal.assetPath!])}
                          />
                        )
                      ) : (`,
    );
  }

  if (!next.includes("Unlocks Level {requiredLevel}")) {
    next = next.replace(
`                      <div className="flex flex-wrap gap-1.5">
                        {offer.animal.phase === "anaconda" ? (`,
`                      <div className="flex flex-wrap gap-1.5">
                        {locked ? (
                          <span className="rounded-full border border-amber-200/15 bg-amber-200/[.05] px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] text-amber-100/70">Unlocks Level {requiredLevel}</span>
                        ) : null}
                        {offer.animal.phase === "anaconda" ? (`,
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
  return next;
}, "Rendered committed Emerald sprites in the separate boa market bar with visible level locks.");

update(workspacePath, (source) => {
  let next = source;
  if (!next.includes("function emeraldSpriteStyle")) {
    next = next.replace("type EconomyAction =", spriteHelper + "\ntype EconomyAction =");
  }
  const portrait = `function EmeraldPortrait({ animal, failed, onFail }: { animal: EmeraldAnimal; failed: boolean; onFail: () => void }) {
  const spriteStyle = emeraldSpriteStyle(animal);
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-white/[.055] bg-[radial-gradient(circle_at_50%_38%,rgba(52,211,153,.12),transparent_42%),#020605]">
      {animal.assetPath && !failed ? (
        spriteStyle ? (
          <div
            role="img"
            aria-label={emeraldSpeciesDisplayName(animal.speciesId) + " game asset"}
            className="absolute inset-1 rounded-[16px] bg-black"
            style={spriteStyle}
          />
        ) : (
          <Image
            src={animal.assetPath}
            alt={emeraldSpeciesDisplayName(animal.speciesId) + " game asset"}
            fill
            sizes="(max-width: 768px) 90vw, 320px"
            className="object-contain p-1"
            onError={onFail}
          />
        )
      ) : (
        <div className="absolute inset-0 grid place-items-center p-5 text-center">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/10 bg-emerald-300/[.04] text-2xl text-emerald-100/40">◆</div>
            <div className="mt-3 text-[10px] font-black uppercase tracking-[.15em] text-white/30">Asset slot ready</div>
            <div className="mt-1 text-xs text-white/22">{animal.assetId ?? "Emerald artwork pending upload"}</div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}

`;
  next = next.replace(/function EmeraldPortrait\([\s\S]*?\n}\n\nfunction EmptyState/, portrait + "function EmptyState");
  return next;
}, "Rendered committed Emerald sprites throughout My Animals and breeding views.");
