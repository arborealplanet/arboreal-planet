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

  writeIfChanged(gtpShopPath, next, source, "Aligned the Green Tree Python shop with the exact Chondro Dojo 2 Stack and PVC Enclosure names.");
}
