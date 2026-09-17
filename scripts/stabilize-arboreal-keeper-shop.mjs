import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");
const keeperWorkspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");
const gtpShopPath = path.join(root, "src/components/ChondroBreederExpandedShop.tsx");

function update(filePath, transform, label) {
  if (!fs.existsSync(filePath)) return;
  const source = fs.readFileSync(filePath, "utf8");
  const next = transform(source);
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[keeper-shop] ${label}`);
  }
}

update(gtpShopPath, (source) => {
  let next = source;
  next = next
    .replace("Housing shop", "Enclosures")
    .replace("Two enclosures. Clear rules.", "Enclosures")
    .replace("Green Tree Python market", "Green Tree Pythons")
    .replace("20 daily listings", "Green Tree Python carousel")
    .replace("Browse the current rotation. Every card shows the housing type the animal can actually use.", "Browse the current Green Tree Python rotation.");
  return next;
}, "Simplified Green Tree Python shop section labels.");

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
    .replace("Emerald Tree Boas", "Emerald Tree Boas")
    .replace("Northern + Amazon Basin listings", "Emerald Tree Boa carousel")
    .replace("A separate horizontal market directly beneath the Green Tree Python store. Every Emerald Tree Boa requires its own enclosure.", "Browse Northern and Amazon Basin Emerald Tree Boas in the same carousel format.")
    .replace("Quick-buy an individual compatible enclosure without leaving the shop.", "Quick-buy compatible housing without leaving the shop. Chondro Dojo 2 Stacks add two individual neonate spaces.")
    .replace("Owned: {save.housingUnits.length}", "Housing spaces: {save.housingUnits.length}")
    .replace('{enclosure.sizeClass} · one animal', '{enclosure.sizeClass} · {id === "chondro-dojo-bin" ? "two individual spaces" : "one individual space"}');

  return next;
}, "Fixed Emerald market Dojo capacity, sprite cropping, and carousel copy.");

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

update(keeperWorkspacePath, (source) => {
  let next = source;

  const expandedImport = 'import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";';
  const emeraldImport = 'import { ArborealKeeperEmeraldMarketBar } from "@/components/ArborealKeeperEmeraldMarketBar";';
  if (!next.includes(emeraldImport) && next.includes(expandedImport)) {
    next = next.replace(expandedImport, `${expandedImport}\n${emeraldImport}`);
  }

  next = next
    .replace('import { ChondroFavoritesMarketPanel } from "@/components/ChondroFavoritesMarketPanel";\n', "")
    .replace('import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";\n', "")
    .replace('{ id: "market", label: "Store", detail: "Buy chondros and use the player market", icon: "$" },', '{ id: "market", label: "Repti-Shop", navLabel: "Shop", detail: "Enclosures and rotating animal listings", icon: "$" },')
    .replace('market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Browse rotating game inventory first, then shop breeder-to-breeder listings and manage your seller activity." },', 'market: { eyebrow: "Arboreal Keeper", title: "Repti-Shop", detail: "Enclosures first, followed by one carousel for each animal group in the store." },')
    .replace('{view === "breeding" || view === "colony" || view === "market" ? <ChondroBreederScreenArt screen={view} /> : null}', '{view === "breeding" || view === "colony" ? <ChondroBreederScreenArt screen={view} /> : null}');

  const oldMarketIntro = `      {view === "market" ? (
        <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-amber-200/15 bg-amber-200/[.035] px-4 py-3 text-sm text-amber-50/70">
              <strong className="text-amber-100">Snake Store:</strong> rotating chondros are below. Purchases use your breeder cash and require an open enclosure.
            </div>
            <div className="rounded-[24px] border border-emerald-300/12 bg-emerald-300/[.03] px-4 py-3 text-xs leading-5 text-white/48">
              <strong className="text-emerald-100/80">48-hour market fallback:</strong> player listings that remain unsold for two days are cleared automatically at 85% of their asking price. Pure subspecies animals are acquired by the conservation program and count toward the shared conservation goal, but the seller receives no personal conservation credit. Other animals are placed through the game&apos;s NPC pet market.
            </div>
          </div>
        </div>
      ) : null}
      {view === "market" ? <ChondroBreederExpandedShop /> : null}
      {view === "market" ? <ChondroPlayerMarket /> : null}`;
  const newMarketIntro = `      {view === "market" ? (
        <>
          <ChondroBreederExpandedShop />
          <ArborealKeeperEmeraldMarketBar />
        </>
      ) : null}`;
  if (next.includes(oldMarketIntro)) next = next.replace(oldMarketIntro, newMarketIntro);

  next = next.replace('      {view === "market" ? <ChondroFavoritesMarketPanel /> : null}\n', "");
  next = next.replace(
    '      <ChondroBreederGameV3 screen={view} />',
    '      <div className={view === "market" ? "hidden" : undefined} aria-hidden={view === "market" ? true : undefined}><ChondroBreederGameV3 screen={view} /></div>',
  );

  return next;
}, "Reduced Repti-Shop to Enclosures, Green Tree Python carousel, and Emerald Tree Boa carousel.");
