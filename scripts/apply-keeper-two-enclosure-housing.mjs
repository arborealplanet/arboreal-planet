import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enginePath = path.join(root, "src/lib/arboreal-keeper-emerald-engine.ts");
const marketPath = path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");
const gtpShopPath = path.join(root, "src/components/ChondroBreederExpandedShop.tsx");

function writeIfChanged(filePath, next, source, label) {
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[keeper-housing] ${label}`);
  }
}

if (fs.existsSync(enginePath)) {
  const source = fs.readFileSync(enginePath, "utf8");
  let next = source;

  if (!next.includes("normalizeKeeperEnclosureId")) {
    next = next.replace(
      "  enclosureSupportsAnimal,\n  type KeeperEnclosureId,",
      "  enclosureSupportsAnimal,\n  normalizeKeeperEnclosureId,\n  type KeeperEnclosureId,",
    );
  }

  if (!next.includes("function sanitizeEmeraldHousingUnits")) {
    next = next.replace(
      "export function sanitizeEmeraldKeeperSave(value: unknown): EmeraldKeeperSave {",
`function sanitizeEmeraldHousingUnits(value: unknown): EmeraldHousingUnit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const input = entry as { id?: unknown; enclosureId?: unknown; occupantId?: unknown };
    const enclosureId = normalizeKeeperEnclosureId(input.enclosureId);
    if (!enclosureId) return [];
    return [{
      id: typeof input.id === "string" && input.id ? input.id : \`keeper-housing-migrated-\${index}\`,
      enclosureId,
      occupantId: typeof input.occupantId === "string" ? input.occupantId : null,
    }];
  });
}

export function sanitizeEmeraldKeeperSave(value: unknown): EmeraldKeeperSave {`,
    );
  }

  next = next.replace(
    "    housingUnits: Array.isArray(input.housingUnits) ? input.housingUnits : [],",
    "    housingUnits: sanitizeEmeraldHousingUnits(input.housingUnits),",
  );

  writeIfChanged(enginePath, next, source, "Migrated retired Emerald housing IDs into Chondro Dojo or PVC saves.");
}

for (const filePath of [marketPath, workspacePath]) {
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  let next = source;

  next = next.replace(
`const HOUSING_IDS: KeeperEnclosureId[] = [
  "neonate-arboreal-tub",
  "pvc-arboreal-medium",
  "glass-arboreal-medium",
  "glass-arboreal-large",
];`,
`const HOUSING_IDS: KeeperEnclosureId[] = [
  "chondro-dojo-bin",
  "pvc-arboreal-medium",
];`,
  );

  next = next.replace(
`const HOUSING_SHOP_IDS: KeeperEnclosureId[] = [
  "neonate-arboreal-tub",
  "pvc-arboreal-medium",
  "glass-arboreal-medium",
  "glass-arboreal-large",
];`,
`const HOUSING_SHOP_IDS: KeeperEnclosureId[] = [
  "chondro-dojo-bin",
  "pvc-arboreal-medium",
];`,
  );

  next = next
    .split("Neonate Arboreal Tub")
    .join("Chondro Dojo 2 Stack")
    .split("PVC Arboreal")
    .join("PVC Enclosure")
    .split("Medium Arboreal Vivarium")
    .join("PVC Enclosure")
    .split("Large Arboreal Display")
    .join("PVC Enclosure");

  writeIfChanged(
    filePath,
    next,
    source,
    `${path.basename(filePath)} now offers only Chondro Dojo 2 Stack and PVC Enclosure.`,
  );
}

if (fs.existsSync(gtpShopPath)) {
  const source = fs.readFileSync(gtpShopPath, "utf8");
  let next = source;

  next = next
    .replace(
      '"Chondro Dojo Bin": { label: "Chondro Dojo Pair", detail: "Two space-saving Dojo enclosures sold as one set. The pair uses one facility slot and houses two snakes." },',
      '"Chondro Dojo Bin": { label: "Chondro Dojo 2 Stack", detail: "The original two-enclosure Chondro Dojo stack. One stack uses one facility slot and provides two individual animal spaces." },',
    )
    .replace(
      '"PVC Arboreal": { label: "PVC Arboreal Enclosure", detail: "Permanent front-opening arboreal housing built around PVC structure and perching." },',
      '"PVC Arboreal": { label: "PVC Enclosure", detail: "The original full-size PVC arboreal enclosure for eligible subadult and adult animals." },',
    )
    .split("A Chondro Dojo Pair uses that same single facility slot for two snakes.")
    .join("A Chondro Dojo 2 Stack uses that same single facility slot for two individually housed animals.")
    .split("Illustrated Chondro Dojo enclosure with white PVC perches")
    .join("Illustrated Chondro Dojo 2 Stack enclosure with white PVC perches")
    .split('aria-label="PVC arboreal enclosure diagram"')
    .join('aria-label="PVC enclosure diagram"');

  if (!next.includes("function hasCompatibleGtpHousingForStage")) {
    const componentAnchor = "export function ChondroBreederExpandedShop() {";
    const helper = `function hasCompatibleGtpHousingForStage(\n  enclosures: Record<string, number> | undefined,\n  colony: Snake[],\n  stage: LifeStage,\n) {\n  const dojoSpaces = Math.max(0, Number(enclosures?.[\"Chondro Dojo Bin\"] ?? 0) || 0) * 2;\n  const pvcSpaces = Math.max(0, Number(enclosures?.[\"PVC Arboreal\"] ?? 0) || 0);\n  const young = colony.filter((snake) => snake.lifeStage === \"Hatchling\" || snake.lifeStage === \"Neonate\").length;\n  const subadults = colony.filter((snake) => snake.lifeStage === \"Subadult\").length;\n  const adults = colony.filter((snake) => snake.lifeStage === \"Adult\").length;\n  const dojoFree = dojoSpaces - young;\n  const pvcFree = pvcSpaces - adults;\n\n  if (dojoFree < 0 || pvcFree < 0) return false;\n\n  if (stage === \"Hatchling\" || stage === \"Neonate\") {\n    const subadultsForcedIntoDojo = Math.max(0, subadults - pvcFree);\n    return dojoFree - subadultsForcedIntoDojo > 0;\n  }\n\n  if (stage === \"Adult\") {\n    const subadultsForcedIntoPvc = Math.max(0, subadults - dojoFree);\n    return pvcFree - subadultsForcedIntoPvc > 0;\n  }\n\n  return dojoFree + pvcFree - subadults > 0;\n}\n\nfunction gtpHousingRequirement(stage: LifeStage) {\n  if (stage === \"Adult\") return \"PVC Enclosure required\";\n  if (stage === \"Subadult\") return \"Chondro Dojo 2 Stack or PVC Enclosure\";\n  return \"Chondro Dojo 2 Stack required\";\n}\n\n`;
    if (!next.includes(componentAnchor)) {
      throw new Error("[keeper-housing] Could not find the GTP shop component anchor for stage-aware housing.");
    }
    next = next.replace(componentAnchor, helper + componentAnchor);
  }

  next = next.replace(
    "    if (!save || busy || purchased.has(offer.id) || openSlots <= 0 || save.cash < offer.price) return;",
`    if (!save || busy || purchased.has(offer.id) || openSlots <= 0 || save.cash < offer.price) return;
    if (!hasCompatibleGtpHousingForStage(save.enclosures, save.colony, offer.lifeStage)) {
      setStatus(\`${'${offer.name}'} needs compatible housing before purchase. ${'${gtpHousingRequirement(offer.lifeStage)}'}.\`);
      return;
    }`,
  );

  next = next.replace(
`            const sold = purchased.has(offer.id);
            const effect = conservation.find((row) => row.subspecies === offer.subspecies);`,
`            const sold = purchased.has(offer.id);
            const effect = conservation.find((row) => row.subspecies === offer.subspecies);
            const compatibleHousing = hasCompatibleGtpHousingForStage(save.enclosures, save.colony, offer.lifeStage);`,
  );

  next = next.replace(
    'disabled={sold || busy !== null || save.cash < offer.price || openSlots <= 0}',
    'disabled={sold || busy !== null || save.cash < offer.price || openSlots <= 0 || !compatibleHousing}',
  );
  next = next.replace(
    '{sold ? "Purchased" : openSlots <= 0 ? "Need space" : "Buy"}',
    '{sold ? "Purchased" : !compatibleHousing ? "Need housing" : openSlots <= 0 ? "Need space" : "Buy"}',
  );

  if (!next.includes("Housing · {gtpHousingRequirement(offer.lifeStage)}")) {
    next = next.replace(
      '<div className={`mt-1 text-[10px] font-semibold ${offer.neonateColor === "Red" ? "text-red-100/65" : "text-amber-100/65"}`}>Neonate color: {offer.neonateColor}</div>',
      '<div className={`mt-1 text-[10px] font-semibold ${offer.neonateColor === "Red" ? "text-red-100/65" : "text-amber-100/65"}`}>Neonate color: {offer.neonateColor}</div>\n                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[.08em] text-sky-100/45">Housing · {gtpHousingRequirement(offer.lifeStage)}</div>',
    );
  }

  writeIfChanged(gtpShopPath, next, source, "Aligned GTP enclosure names and enforced life-stage-compatible individual housing in the store.");
}
