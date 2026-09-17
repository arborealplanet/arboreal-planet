import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function update(filePath, transform, label) {
  if (!fs.existsSync(filePath)) return;
  const source = fs.readFileSync(filePath, "utf8");
  const next = transform(source);
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[keeper-shop] ${label}`);
  }
}

update(marketPath, (source) => {
  let next = source;

  const progressionImport = 'import { keeperLevelFromReputation } from "@/lib/arboreal-keeper-progression";';
  const spriteImport = 'import { keeperAssetSpriteStyle } from "@/lib/arboreal-keeper-species";';
  if (!next.includes(spriteImport) && next.includes(progressionImport)) {
    next = next.replace(progressionImport, `${progressionImport}\n${spriteImport}`);
  }

  const oldHousing = `        housingUnits: [
          ...save.housingUnits,
          {
            id: \`keeper-housing-\${enclosureId}-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}\`,
            enclosureId,
            occupantId: null,
          },
        ],`;
  const newHousing = `        housingUnits: [
          ...save.housingUnits,
          ...Array.from({ length: enclosureId === "chondro-dojo-bin" ? 2 : 1 }, (_, index) => ({
            id: \`keeper-housing-\${enclosureId}-\${Date.now()}-\${index}-\${Math.random().toString(36).slice(2, 7)}\`,
            enclosureId,
            occupantId: null,
          })),
        ],`;
  if (next.includes(oldHousing)) next = next.replace(oldHousing, newHousing);

  next = next.replace(
    'setStatus(`${enclosure.displayName} added. It can house one compatible animal.`);',
    'setStatus(`${enclosure.displayName} added. ${enclosureId === "chondro-dojo-bin" ? "Two individual housing spaces are now available." : "One individual housing space is now available."}`);',
  );

  const traitsLine = "                const traits = strongestTraits(offer.animal);";
  const spriteLine = "                const spriteStyle = keeperAssetSpriteStyle(offer.animal.speciesId, offer.animal.assetId);";
  next = next.split(`\n${spriteLine}`).join("");
  if (next.includes(traitsLine)) next = next.replace(traitsLine, `${traitsLine}\n${spriteLine}`);

  const imageBlock = `                      {showImage ? (
                        <Image
                          src={offer.animal.assetPath!}
                          alt={\`${'${emeraldSpeciesDisplayName(offer.animal.speciesId)}'} ${'${offer.animal.lifeStage}'}\`}
                          fill
                          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 33vw"
                          className="object-contain p-2"
                          onError={() => setBrokenAssets((current) => current.includes(offer.animal.assetPath!) ? current : [...current, offer.animal.assetPath!])}
                        />
                      ) : (`;
  const spriteBlock = `                      {spriteStyle ? (
                        <div className="absolute inset-2 bg-no-repeat" style={spriteStyle} aria-label={\`${'${emeraldSpeciesDisplayName(offer.animal.speciesId)}'} ${'${offer.animal.lifeStage}'}\`} />
                      ) : showImage ? (
                        <Image
                          src={offer.animal.assetPath!}
                          alt={\`${'${emeraldSpeciesDisplayName(offer.animal.speciesId)}'} ${'${offer.animal.lifeStage}'}\`}
                          fill
                          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 33vw"
                          className="object-contain p-2"
                          onError={() => setBrokenAssets((current) => current.includes(offer.animal.assetPath!) ? current : [...current, offer.animal.assetPath!])}
                        />
                      ) : (`;
  if (next.includes(imageBlock)) next = next.replace(imageBlock, spriteBlock);

  next = next
    .replace("Quick-buy an individual compatible enclosure without leaving the shop.", "Quick-buy compatible housing without leaving the shop. Chondro Dojo 2 Stacks add two individual neonate spaces.")
    .replace("Owned: {save.housingUnits.length}", "Housing spaces: {save.housingUnits.length}")
    .replace('{enclosure.sizeClass} · one animal', '{enclosure.sizeClass} · {id === "chondro-dojo-bin" ? "two individual spaces" : "one individual space"}');

  return next;
}, "Fixed Emerald market Dojo capacity, sprite cropping, and housing copy.");

update(workspacePath, (source) => {
  let next = source;
  const oldBlock = `    const unit = {
      id: \`keeper-housing-\${enclosureId}-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}\`,
      enclosureId,
      occupantId: null,
    };
    setSave((current) => ({ ...current, housingUnits: [...current.housingUnits, unit] }));
    setMessage(\`${'${enclosure.displayName}'} added. This enclosure holds one animal.\`);`;
  const newBlock = `    const units = Array.from({ length: enclosureId === "chondro-dojo-bin" ? 2 : 1 }, (_, index) => ({
      id: \`keeper-housing-\${enclosureId}-\${Date.now()}-\${index}-\${Math.random().toString(36).slice(2, 7)}\`,
      enclosureId,
      occupantId: null,
    }));
    setSave((current) => ({ ...current, housingUnits: [...current.housingUnits, ...units] }));
    setMessage(\`${'${enclosure.displayName}'} added. ${'${enclosureId === "chondro-dojo-bin" ? "Two individual housing spaces are now available." : "One individual housing space is now available."}'}\`);`;
  if (next.includes(oldBlock)) next = next.replace(oldBlock, newBlock);
  return next;
}, "Fixed Emerald workspace Dojo 2 Stack capacity.");
