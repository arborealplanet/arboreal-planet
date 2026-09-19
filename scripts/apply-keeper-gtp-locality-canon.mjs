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


  if (!next.includes('| "Arfak"')) {
    next = next.replace(
      '| "Manokwari"\n  | "Sorong"',
      '| "Manokwari"\n  | "Arfak"\n  | "Sorong"',
    );
    next = next.replace(
      '| "Manokwari" | "Sorong"',
      '| "Manokwari" | "Arfak" | "Sorong"',
    );
  }

  if (next.includes("const localitySubspecies: Record<Locality, Subspecies> = {") && !next.includes('  Arfak: "Morelia azurea pulcher",')) {
    next = next.replace(
      '  Manokwari: "Morelia azurea pulcher",\n  Sorong: "Morelia azurea pulcher",',
      '  Manokwari: "Morelia azurea pulcher",\n  Arfak: "Morelia azurea pulcher",\n  Sorong: "Morelia azurea pulcher",',
    );
  }

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

  // Canon used by Arboreal Keeper / Chondro Breeder.
  // Important: Biak belongs to Morelia azurea azurea and Cyclops belongs to
  // Morelia azurea utaraensis. Do not reverse these during build patches.
  next = next
    .replace('  Biak: "Morelia viridis",', '  Biak: "Morelia azurea azurea",')
    .replace('  Cyclops: "Morelia azurea azurea",', '  Cyclops: "Morelia azurea utaraensis",')
    .replace('  Jayapura: "Morelia azurea azurea",', '  Jayapura: "Morelia azurea utaraensis",')
    .replace('  Lereh: "Morelia azurea azurea",', '  Lereh: "Morelia azurea utaraensis",');

  if (next.includes("const localitySubspecies: Record<Locality, Subspecies> = {") && !next.includes('  Yapen: "Morelia azurea utaraensis",')) {
    next = next.replace(
      '  Wamena: "Morelia azurea utaraensis",\n  Aru: "Morelia viridis",',
      '  Wamena: "Morelia azurea utaraensis",\n  Yapen: "Morelia azurea utaraensis",\n  Aru: "Morelia viridis",',
    );
  }

  // Keep the daily shop pools aligned with the breeder's locality map.
  if (next.includes("const localitiesBySubspecies: Record<Subspecies, Locality[]> = {")) {
    const start = next.indexOf("const localitiesBySubspecies: Record<Subspecies, Locality[]> = {");
    const end = next.indexOf("};", start);
    if (start >= 0 && end > start) {
      const canonical = `const localitiesBySubspecies: Record<Subspecies, Locality[]> = {\n  "Morelia azurea azurea": ["Biak", "Numfor"],\n  "Morelia azurea pulcher": ["Manokwari", "Arfak", "Sorong", "Timika"],\n  "Morelia azurea utaraensis": ["Cyclops", "Jayapura", "Lereh", "Wamena", "Yapen"],\n  "Morelia viridis": ["Aru", "Merauke"],\n}`;
      next = next.slice(0, start) + canonical + next.slice(end + 1);
    }
  }

  writeIfChanged(filePath, next, source);
}
