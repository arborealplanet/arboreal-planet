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
];

for (const { file, pairs } of replacements) {
  let source = fs.readFileSync(file, "utf8");
  let changed = false;

  for (const [before, after] of pairs) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Juvenile art patch could not find expected source in ${file}: ${before}`);
    }
    source = source.replaceAll(before, after);
    changed = true;
  }

  if (changed) fs.writeFileSync(file, source);
}

console.log("Applied Chondro juvenile-art wiring for hatchlings, neonates and subadults.");
