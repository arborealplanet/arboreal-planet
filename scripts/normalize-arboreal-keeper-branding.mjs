import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const allowedExtensions = new Set([".ts", ".tsx"]);
const replacements = [
  ["CHONDRO BREEDER", "ARBOREAL KEEPER"],
  ["Chondro Breeder", "Arboreal Keeper"],
  ["Chondro breeder", "Arboreal Keeper"],
  ["Chondro Store", "Animal Market"],
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (allowedExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

let touched = 0;
for (const filePath of walk(srcRoot)) {
  const source = fs.readFileSync(filePath, "utf8");
  let next = source;
  for (const [before, after] of replacements) next = next.split(before).join(after);
  if (next === source) continue;
  fs.writeFileSync(filePath, next);
  touched += 1;
}

console.log(`[keeper-branding] Normalized Arboreal Keeper branding in ${touched} source file${touched === 1 ? "" : "s"}.`);
