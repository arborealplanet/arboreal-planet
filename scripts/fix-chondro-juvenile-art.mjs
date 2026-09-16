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

const oldBuildOffers = `function buildOffers(seed: number, rows: ConservationRow[]) {
  const random = rng(seed * 7919 + 20260908);
  const effects = effectMap(rows);
  return Array.from({ length: 20 }, (_, index) => makeRandomOffer(seed, index, random, effects));
}`;
const newBuildOffers = `function buildOffers(seed: number, rows: ConservationRow[]) {
  const random = rng(seed * 7919 + 20260908);
  const effects = effectMap(rows);
  const yellowShowcase: Array<[Subspecies, Locality]> = [
    ["Morelia azurea azurea", "Biak"],
    ["Morelia azurea pulcher", "Manokwari"],
    ["Morelia azurea utaraensis", "Cyclops"],
  ];

  return Array.from({ length: 20 }, (_, index) => {
    const offer = makeRandomOffer(seed, index, random, effects);
    const forced = yellowShowcase[index];
    if (!forced) return offer;

    const [subspecies, locality] = forced;
    return {
      ...offer,
      name: locality + " Yellow Juvenile",
      subspecies,
      locality,
      neonateColor: "Yellow" as const,
      lifeStage: "Neonate" as const,
      localityAncestry: { [locality]: 100 },
      body: subspecies,
      tail: subspecies === "Morelia azurea utaraensis" ? "Matching body color and pattern" : "Black-dipped",
      eyes: subspecies,
      head: subspecies,
      pattern: locality,
      color: locality,
      ancestry: { [subspecies]: 100 },
      featured: true,
      specialLabel: "Yellow juvenile showcase",
    };
  });
}`;

if (expandedShop.includes(oldBuildOffers)) {
  expandedShop = expandedShop.replace(oldBuildOffers, newBuildOffers);
  expandedShopChanged = true;
} else if (!expandedShop.includes("const yellowShowcase: Array<[Subspecies, Locality]>") ) {
  throw new Error("Yellow juvenile shop showcase patch could not find buildOffers.");
}

if (expandedShopChanged) fs.writeFileSync(expandedShopFile, expandedShop);

console.log("Applied Chondro juvenile-art wiring plus guaranteed yellow juvenile shop showcases.");
