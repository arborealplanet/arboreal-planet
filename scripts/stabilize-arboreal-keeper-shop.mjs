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
}, "Kept Repti-Shop enclosure and Green Tree Python sections concise.");

update(marketPath, (source) => {
  let next = source;

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

  next = next
    .replace("Northern + Amazon Basin listings", "Emerald Tree Boa carousel")
    .replace("A separate horizontal market directly beneath the Green Tree Python store. Every Emerald Tree Boa requires its own enclosure.", "Browse Northern and Amazon Basin Emerald Tree Boas in the same carousel format.");

  const housingStartMarker = '\n        <div className="mt-4 border-t border-white/[.055] pt-4">';
  const statusMarker = '\n\n        {status ?';
  const housingStart = next.indexOf(housingStartMarker);
  if (housingStart >= 0) {
    const statusStart = next.indexOf(statusMarker, housingStart);
    if (statusStart >= 0) {
      next = next.slice(0, housingStart) + next.slice(statusStart);
    }
  }

  return next;
}, "Removed duplicate Emerald housing shop and kept only the Emerald Tree Boa carousel.");

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
}, "Kept Emerald Dojo 2 Stack capacity correct.");

update(keeperWorkspacePath, (source) => {
  let next = source;

  const anchorImport = 'import { ChondroBreederNavIcon } from "@/components/ChondroBreederNavIcon";';
  const shopImport = 'import { ArborealKeeperReptiShop } from "@/components/ArborealKeeperReptiShop";';
  if (!next.includes(shopImport) && next.includes(anchorImport)) {
    next = next.replace(anchorImport, `${anchorImport}\n${shopImport}`);
  }

  next = next
    .replace('{ id: "market", label: "Store", detail: "Buy chondros and use the player market", icon: "$" },', '{ id: "market", label: "Repti-Shop", navLabel: "Shop", detail: "Enclosures and rotating animal listings", icon: "$" },')
    .replace('{ id: "market", label: "Repti-Shop", detail: "Enclosures and rotating animal listings", icon: "$" },', '{ id: "market", label: "Repti-Shop", navLabel: "Shop", detail: "Enclosures and rotating animal listings", icon: "$" },');

  const functionStart = 'function CoreGameScreen({ view }: { view: CoreView }) {';
  const obsoleteEarlyReturn = `${functionStart}\n  if (view === "market") return <ArborealKeeperReptiShop />;`;
  next = next.replace(obsoleteEarlyReturn, functionStart);

  const legacyCoreMount = '{coreViews.has(view) ? <CoreGameScreen view={view as CoreView} /> : null}';
  const routedCoreMount = '{view === "market" ? <ArborealKeeperReptiShop /> : coreViews.has(view) ? <CoreGameScreen view={view as CoreView} /> : null}';
  if (!next.includes(routedCoreMount) && next.includes(legacyCoreMount)) {
    next = next.replace(legacyCoreMount, routedCoreMount);
  }

  return next;
}, "Routed the Shop tab before the legacy core screen without narrowing CoreGameScreen types.");