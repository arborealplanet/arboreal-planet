import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  "src/components/ChondroBreederGameV3.tsx",
  "src/components/ArborealKeeperMyAnimals.tsx",
  "src/components/ChondroSaveRecoveryGate.tsx",
];

for (const relativePath of targets) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  let next = source
    .split('/api/hatchery/chondro-breeder/repair-save').join('/api/hatchery/arboreal-keeper/repair-save')
    .split('/api/hatchery/chondro-breeder/save').join('/api/hatchery/arboreal-keeper/save');

  if (relativePath.endsWith("ChondroBreederGameV3.tsx")) {
    const legacyDispatch = 'window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));';
    const dualDispatch = `${legacyDispatch}\n      window.dispatchEvent(new Event("arboreal-keeper-save-change"));`;
    if (!next.includes('window.dispatchEvent(new Event("arboreal-keeper-save-change"));')) {
      next = next.split(legacyDispatch).join(dualDispatch);
    }
  }

  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[keeper-core] Migrated canonical API/event usage in ${relativePath}.`);
  }
}
