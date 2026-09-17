import fs from "node:fs";
import path from "node:path";

const enginePath = path.join(process.cwd(), "src/lib/arboreal-keeper-emerald-engine.ts");

if (!fs.existsSync(enginePath)) {
  console.warn("[keeper-save-integrity] Emerald engine missing; skipped.");
  process.exit(0);
}

const source = fs.readFileSync(enginePath, "utf8");
let next = source;

const functionStart = next.indexOf("function sanitizeEmeraldHousingUnits(");
const sanitizerStart = next.indexOf("export function sanitizeEmeraldKeeperSave", Math.max(0, functionStart));

if (functionStart >= 0 && sanitizerStart > functionStart) {
  const enhanced = `// keeper-emerald-housing-integrity\nfunction sanitizeEmeraldHousingUnits(value: unknown, animalsValue: unknown): EmeraldHousingUnit[] {\n  if (!Array.isArray(value)) return [];\n\n  const animalById = new Map<string, { speciesId: EmeraldSpeciesId; lifeStage: KeeperLifeStage }>();\n  if (Array.isArray(animalsValue)) {\n    for (const entry of animalsValue) {\n      if (!entry || typeof entry !== \"object\" || Array.isArray(entry)) continue;\n      const animal = entry as { id?: unknown; speciesId?: unknown; lifeStage?: unknown };\n      if (typeof animal.id !== \"string\" || !animal.id) continue;\n      const speciesId = animal.speciesId === \"northern_emerald_tree_boa\" || animal.speciesId === \"amazon_basin_emerald_tree_boa\"\n        ? animal.speciesId\n        : null;\n      const lifeStage = animal.lifeStage === \"neonate\" || animal.lifeStage === \"subadult\" || animal.lifeStage === \"adult\"\n        ? animal.lifeStage\n        : null;\n      if (speciesId && lifeStage) animalById.set(animal.id, { speciesId, lifeStage });\n    }\n  }\n\n  const seenOccupants = new Set<string>();\n  return value.flatMap((entry, index) => {\n    if (!entry || typeof entry !== \"object\" || Array.isArray(entry)) return [];\n    const input = entry as { id?: unknown; enclosureId?: unknown; occupantId?: unknown };\n    const enclosureId = normalizeKeeperEnclosureId(input.enclosureId);\n    if (!enclosureId) return [];\n\n    let occupantId = typeof input.occupantId === \"string\" && input.occupantId ? input.occupantId : null;\n    if (occupantId) {\n      const animal = animalById.get(occupantId);\n      if (\n        !animal ||\n        seenOccupants.has(occupantId) ||\n        !enclosureSupportsAnimal(enclosureId, animal.speciesId, animal.lifeStage)\n      ) {\n        occupantId = null;\n      } else {\n        seenOccupants.add(occupantId);\n      }\n    }\n\n    return [{\n      id: typeof input.id === \"string\" && input.id ? input.id : \`keeper-housing-migrated-\${index}\`,\n      enclosureId,\n      occupantId,\n    }];\n  });\n}\n\n`;

  next = next.slice(0, functionStart) + enhanced + next.slice(sanitizerStart);
  next = next.replace(
    "    housingUnits: sanitizeEmeraldHousingUnits(input.housingUnits),",
    "    housingUnits: sanitizeEmeraldHousingUnits(input.housingUnits, input.animals),",
  );
}

if (next !== source) {
  fs.writeFileSync(enginePath, next);
  console.log("[keeper-save-integrity] Emerald housing now removes missing, duplicate and life-stage-incompatible occupants while preserving the animals themselves.");
} else if (source.includes("keeper-emerald-housing-integrity")) {
  console.log("[keeper-save-integrity] Emerald housing integrity patch already applied.");
} else {
  console.warn("[keeper-save-integrity] Expected housing sanitizer was not found; no changes made.");
}
