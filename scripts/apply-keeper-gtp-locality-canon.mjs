import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  path.join(root, "src/components/ChondroBreederGameV3.tsx"),
  path.join(root, "src/components/ChondroBreederExpandedShop.tsx"),
];

function writeIfChanged(filePath, next, source) {
  if (next === source) return;
  fs.writeFileSync(filePath, next);
  console.log(`[keeper-localities] Applied canonical GTP locality mapping to ${path.basename(filePath)}.`);
}

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  let next = source;

  // Preserve legacy locality strings for old saves while making Yapen available
  // to the current Utaraensis program.
  if (!next.includes('| "Yapen"')) {
    next = next.replace(
      '| "Wamena"\n  | "Aru"',
      '| "Wamena"\n  | "Yapen"\n  | "Aru"',
    );
    next = next.replace(
      '| "Wamena" | "Aru"',
      '| "Wamena" | "Yapen" | "Aru"',
    );
  }

  // Main game locality -> taxon lookup. Numfor/Wamena remain accepted for
  // backward-compatible saves, but newly generated animals use only the
  // explicit canonical locality pools below.
  next = next
    .replace('  Biak: "Morelia azurea azurea",', '  Biak: "Morelia viridis",')
    .replace('  Cyclops: "Morelia azurea utaraensis",', '  Cyclops: "Morelia azurea azurea",')
    .replace('  Jayapura: "Morelia azurea utaraensis",', '  Jayapura: "Morelia azurea azurea",')
    .replace('  Lereh: "Morelia azurea utaraensis",', '  Lereh: "Morelia azurea azurea",');

  if (next.includes("const localitySubspecies: Record<Locality, Subspecies> = {") && !next.includes('  Yapen: "Morelia azurea utaraensis",')) {
    next = next.replace(
      '  Wamena: "Morelia azurea utaraensis",\n  Aru: "Morelia viridis",',
      '  Wamena: "Morelia azurea utaraensis",\n  Yapen: "Morelia azurea utaraensis",\n  Aru: "Morelia viridis",',
    );
  }

  // The expanded store should only generate localities whose current project
  // assignments are explicit. Legacy Numfor/Wamena values remain readable but
  // are not introduced into new daily inventory.
  if (next.includes("const localitiesBySubspecies: Record<Subspecies, Locality[]> = {")) {
    const start = next.indexOf("const localitiesBySubspecies: Record<Subspecies, Locality[]> = {");
    const end = next.indexOf("};", start);
    if (start >= 0 && end > start) {
      const canonical = `const localitiesBySubspecies: Record<Subspecies, Locality[]> = {\n  "Morelia azurea azurea": ["Cyclops", "Jayapura", "Lereh"],\n  "Morelia azurea pulcher": ["Manokwari", "Sorong", "Timika"],\n  "Morelia azurea utaraensis": ["Yapen"],\n  "Morelia viridis": ["Biak", "Aru", "Merauke"],\n}`;
      next = next.slice(0, start) + canonical + next.slice(end + 1);
    }
  }

  writeIfChanged(filePath, next, source);
}
