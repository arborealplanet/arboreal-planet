import fs from "node:fs";

const replacements = [
  {
    file: "src/components/ChondroBreederGameV3.tsx",
    pairs: [
      [
        '<ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={portraitTraits(offer)} compact />',
        '<ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={portraitTraits(offer)} compact lifeStage={offer.lifeStage} neonateColor={offer.neonateColor} />',
      ],
      [
        '<ChondroSnakeIcon subspecies={baby.subspecies} name={baby.name} traits={portraitTraits(baby)} compact />',
        '<ChondroSnakeIcon subspecies={baby.subspecies} name={baby.name} traits={portraitTraits(baby)} compact lifeStage={clutchEstablished ? "Neonate" : "Hatchling"} neonateColor={baby.neonateColor} />',
      ],
      [
        '<ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} traits={portraitTraits(animal)} />',
        '<ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} traits={portraitTraits(animal)} lifeStage={animal.lifeStage} neonateColor={animal.neonateColor} />',
      ],
      [
        '<ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} traits={portraitTraits(animal)} compact />',
        '<ChondroSnakeIcon subspecies={animal.subspecies} name={animal.name} traits={portraitTraits(animal)} compact lifeStage={animal.lifeStage} neonateColor={animal.neonateColor} />',
      ],
      [
        '<ChondroSnakeIcon subspecies={selectedAnimal.subspecies} name={selectedAnimal.name} traits={portraitTraits(selectedAnimal)} />',
        '<ChondroSnakeIcon subspecies={selectedAnimal.subspecies} name={selectedAnimal.name} traits={portraitTraits(selectedAnimal)} lifeStage={selectedAnimal.lifeStage} neonateColor={selectedAnimal.neonateColor} />',
      ],
    ],
  },
  {
    file: "src/components/ChondroBreederExpandedShop.tsx",
    pairs: [
      [
        '<ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={{ highBlack: offer.highBlack, highWhite: offer.highWhite, blueStripe: offer.blueStripe, yellowRetention: offer.yellowRetention, blotches: offer.blotches }} compact />',
        '<ChondroSnakeIcon subspecies={offer.subspecies} name={offer.name} traits={{ highBlack: offer.highBlack, highWhite: offer.highWhite, blueStripe: offer.blueStripe, yellowRetention: offer.yellowRetention, blotches: offer.blotches }} compact lifeStage={offer.lifeStage} neonateColor={offer.neonateColor} />',
      ],
    ],
  },
  {
    file: "src/components/ChondroCollectionManager.tsx",
    pairs: [
      [
        '  lifeStage: string;\n  classification: string;',
        '  lifeStage: string;\n  neonateColor?: "Red" | "Yellow";\n  classification: string;',
      ],
      [
        '<ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} compact />',
        '<ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} lifeStage={animal.lifeStage as never} neonateColor={animal.neonateColor} compact />',
      ],
      [
        '<div className="mx-auto max-w-[360px]"><ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} /></div>',
        '<div className="mx-auto max-w-[360px]"><ChondroSnakeIcon subspecies={animal.subspecies as never} name={animal.name} traits={{ highBlack: animal.highBlack, highWhite: animal.highWhite, blueStripe: animal.blueStripe, yellowRetention: animal.yellowRetention, blotches: animal.blotches }} lifeStage={animal.lifeStage as never} neonateColor={animal.neonateColor} /></div>',
      ],
    ],
  },
];

for (const { file, pairs } of replacements) {
  let source = fs.readFileSync(file, "utf8");
  let changed = false;

  for (const [before, after] of pairs) {
    if (source.includes(after)) continue;

    if (
      file === "src/components/ChondroBreederExpandedShop.tsx" &&
      source.includes("lifeStage={offer.lifeStage}") &&
      source.includes("neonateColor={offer.neonateColor}")
    ) {
      continue;
    }

    if (!source.includes(before)) {
      throw new Error(`Juvenile art patch could not find expected source in ${file}: ${before}`);
    }
    source = source.replaceAll(before, after);
    changed = true;
  }

  if (changed) fs.writeFileSync(file, source);
}

const expandedShopFile = "src/components/ChondroBreederExpandedShop.tsx";
let expandedShop = fs.readFileSync(expandedShopFile, "utf8");
let expandedShopChanged = false;

const oldColorRoll = 'const neonateColor: "Red" | "Yellow" = subspecies === "Morelia viridis" ? "Yellow" : random() < 0.4 ? "Red" : "Yellow";';
const newColorRoll = 'const neonateColor: "Red" | "Yellow" = subspecies === "Morelia viridis" ? "Yellow" : random() < 0.5 ? "Red" : "Yellow";';
if (expandedShop.includes(oldColorRoll)) {
  expandedShop = expandedShop.replace(oldColorRoll, newColorRoll);
  expandedShopChanged = true;
}

// Remove the old hard-coded yellow showcase generator. It created invalid
// locality/subspecies combinations (for example Biak + M. a. azurea) and forced
// art that did not match the generated animal. Daily inventory should come only
// from makeRandomOffer(), whose locality pool is canonicalized later in prebuild.
const forcedShowcasePattern = /function buildOffers\(seed: number, rows: ConservationRow\[\]\) \{[\s\S]*?const yellowShowcase: Array<\[Subspecies, Locality\]> =[\s\S]*?\n\}\n\nfunction parseSave/;
if (forcedShowcasePattern.test(expandedShop)) {
  expandedShop = expandedShop.replace(
    forcedShowcasePattern,
    `function buildOffers(seed: number, rows: ConservationRow[]) {\n  const random = rng(seed * 7919 + 20260908);\n  const effects = effectMap(rows);\n  return Array.from({ length: 20 }, (_, index) => makeRandomOffer(seed, index, random, effects));\n}\n\nfunction parseSave`,
  );
  expandedShopChanged = true;
}

if (expandedShopChanged) fs.writeFileSync(expandedShopFile, expandedShop);

console.log("Applied Chondro stage-aware art wiring without forced showcase animals.");
