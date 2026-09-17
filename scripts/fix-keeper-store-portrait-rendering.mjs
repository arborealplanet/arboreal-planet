import fs from "node:fs";

const file = "src/components/ChondroBreederExpandedShop.tsx";
let source = fs.readFileSync(file, "utf8");
let next = source;

// Store cards should show one real stage/subspecies animal portrait. Trait art is
// reserved for trait-specific displays elsewhere in the game.
next = next.replace(
  /\n\s*traits=\{\{ highBlack: offer\.highBlack, highWhite: offer\.highWhite, blueStripe: offer\.blueStripe, yellowRetention: offer\.yellowRetention, blotches: offer\.blotches \}\}/,
  "",
);

// Keep the canonical Arboreal Keeper locality map in source even if legacy
// scripts change order in the future.
next = next.replace(
  /const localitiesBySubspecies: Record<Subspecies, Locality\[]> = \{[\s\S]*?\n\};/,
  `const localitiesBySubspecies: Record<Subspecies, Locality[]> = {\n  "Morelia azurea azurea": ["Biak", "Numfor"],\n  "Morelia azurea pulcher": ["Manokwari", "Sorong", "Timika"],\n  "Morelia azurea utaraensis": ["Cyclops", "Jayapura", "Lereh", "Wamena", "Yapen"],\n  "Morelia viridis": ["Aru", "Merauke"],\n};`,
);

if (next !== source) {
  fs.writeFileSync(file, next);
  console.log("[keeper-store-portraits] Store cards now use single-animal portraits and canonical GTP localities.");
} else {
  console.log("[keeper-store-portraits] Store portrait rendering already canonical.");
}
