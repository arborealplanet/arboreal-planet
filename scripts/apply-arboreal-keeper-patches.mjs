import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[arboreal-keeper] Expected workspace fragment was not found: ${before.slice(0, 90)}`);
    return source;
  }
  return source.replace(before, after);
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[arboreal-keeper] ChondroBreederWorkspace.tsx not found; skipping shell patch.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");

source = replaceOnce(
  source,
  'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";',
  'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";\nimport { ArborealKeeperSpeciesPrograms } from "@/components/ArborealKeeperSpeciesPrograms";',
);

const replacements = [
  ["Exit Chondro Breeder and return to Arboreal Planet", "Exit Arboreal Keeper and return to Arboreal Planet"],
  [">Chondro Breeder</div>", ">Arboreal Keeper</div>"],
  ['aria-label="Chondro Breeder navigation"', 'aria-label="Arboreal Keeper navigation"'],
  ['{ id: "home", label: "Home", detail: "Breeder command center", icon: "⌂" }', '{ id: "home", label: "Home", detail: "Arboreal Keeper command center", icon: "⌂" }'],
  ['{ id: "colony", label: "Colony", navLabel: "Snakes", detail: "Animals and breeder records", icon: "◎" }', '{ id: "colony", label: "My Animals", navLabel: "Animals", detail: "Animals, species programs and keeper records", icon: "◎" }'],
  ['{ id: "clutches", label: "Clutches", navLabel: "Clutch", detail: "Eggs, hatchlings and clutch history", icon: "◉" }', '{ id: "clutches", label: "Offspring", navLabel: "Offspring", detail: "Eggs, litters, hatchlings and offspring history", icon: "◉" }'],
  ['{ id: "market", label: "Store", detail: "Buy chondros and use the player market", icon: "$" }', '{ id: "market", label: "Animal Market", detail: "Browse animals across unlocked species and use the player market", icon: "$" }'],
  ['{ id: "guide", label: "Field Guide", detail: "Subspecies, locality and phenotype reference", icon: "?" }', '{ id: "guide", label: "Field Guide", detail: "Species, locality and phenotype reference", icon: "?" }'],
  ["Illustrated Chondro Breeder incubator", "Illustrated Arboreal Keeper incubation room"],
  ["Breed, incubate, hatch and build a lineage.", "Breed, raise and build living lineages."],
  ["The Chondro Breeder artwork is part of the main experience. Move between breeding, colony, clutch and store screens to see the program progress visually.", "Arboreal Keeper brings multiple species into one shared facility. Move between breeding, animals, offspring and the market while each species keeps its own biology and progression."],
  ["Manage colony", "Manage animals"],
  ["Review clutches", "Review offspring"],
];

for (const [before, after] of replacements) {
  source = source.split(before).join(after);
}

source = replaceOnce(
  source,
  '          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />',
  '          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />\n\n          <ArborealKeeperSpeciesPrograms />',
);

fs.writeFileSync(workspacePath, source);
console.log("[arboreal-keeper] Applied Arboreal Keeper multispecies shell patches.");
