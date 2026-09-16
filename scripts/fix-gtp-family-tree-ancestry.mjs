import fs from "node:fs";

const file = "src/components/GtpFamilyTreeMaker.tsx";
let source = fs.readFileSync(file, "utf8");
let changed = false;

const oldAncestryFor = `function ancestryFor(animal: TreeAnimal, byId: Map<string, TreeAnimal>, seen = new Set<string>()): Ancestry {
  if (seen.has(animal.id)) return {};
  const nextSeen = new Set(seen).add(animal.id);
  const dam = animal.damId ? byId.get(animal.damId) : null;
  const sire = animal.sireId ? byId.get(animal.sireId) : null;
  if (dam && sire) return combine(ancestryFor(dam, byId, nextSeen), ancestryFor(sire, byId, nextSeen));
  return founderAncestry(animal);
}`;

const newAncestryFor = `function scaleAncestry(ancestry: Ancestry, factor: number): Ancestry {
  const out: Ancestry = {};
  for (const [taxon, value] of Object.entries(ancestry) as Array<[GtpTaxon, number]>) {
    const scaled = Math.round(value * factor * 10) / 10;
    if (scaled > 0) out[taxon] = scaled;
  }
  return out;
}

function addAncestry(a: Ancestry, b: Ancestry): Ancestry {
  const keys = new Set<GtpTaxon>([...(Object.keys(a) as GtpTaxon[]), ...(Object.keys(b) as GtpTaxon[])]);
  const out: Ancestry = {};
  for (const key of keys) {
    const value = Math.round(((a[key] ?? 0) + (b[key] ?? 0)) * 10) / 10;
    if (value > 0) out[key] = value;
  }
  return out;
}

function ancestryFor(animal: TreeAnimal, byId: Map<string, TreeAnimal>, seen = new Set<string>()): Ancestry {
  if (seen.has(animal.id)) return {};
  const nextSeen = new Set(seen).add(animal.id);
  const hasDamLink = Boolean(animal.damId);
  const hasSireLink = Boolean(animal.sireId);
  if (!hasDamLink && !hasSireLink) return founderAncestry(animal);

  const dam = animal.damId ? byId.get(animal.damId) : null;
  const sire = animal.sireId ? byId.get(animal.sireId) : null;
  let out: Ancestry = {};
  if (dam) out = addAncestry(out, scaleAncestry(ancestryFor(dam, byId, nextSeen), 0.5));
  if (sire) out = addAncestry(out, scaleAncestry(ancestryFor(sire, byId, nextSeen), 0.5));
  return out;
}`;

if (source.includes(oldAncestryFor)) {
  source = source.replace(oldAncestryFor, newAncestryFor);
  changed = true;
} else if (!source.includes("function scaleAncestry(")) {
  throw new Error("Could not find ancestryFor() in GtpFamilyTreeMaker.tsx");
}

const oldFormatAncestry = `function formatAncestry(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  if (!entries.length) return "Subspecies ancestry unknown";
  return entries.map(([taxon, value]) => \`\${formatPercent(value)} \${taxon}\`).join(" · ");
}`;

const newFormatAncestry = `function formatAncestry(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  const known = entries.reduce((sum, [, value]) => sum + value, 0);
  const unknown = Math.max(0, Math.round((100 - known) * 10) / 10);
  const parts = entries.map(([taxon, value]) => \`\${formatPercent(value)} \${taxon}\`);
  if (unknown > 0.1) parts.push(\`\${formatPercent(unknown)} Unknown / unresolved\`);
  return parts.length ? parts.join(" · ") : "100% Unknown / unresolved";
}`;

if (source.includes(oldFormatAncestry)) {
  source = source.replace(oldFormatAncestry, newFormatAncestry);
  changed = true;
} else if (!source.includes("Unknown / unresolved")) {
  throw new Error("Could not find formatAncestry() in GtpFamilyTreeMaker.tsx");
}

const oldAncestryLabel = `function ancestryLabel(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  if (!entries.length) return "Unknown ancestry";
  if (entries.length === 1 && entries[0][1] >= 99.9) return \`Pure \${entries[0][0]}\`;
  return "Mixed subspecies ancestry";
}`;

const newAncestryLabel = `function ancestryLabel(ancestry: Ancestry) {
  const entries = ancestryEntries(ancestry);
  if (!entries.length) return "Unknown ancestry";
  const known = entries.reduce((sum, [, value]) => sum + value, 0);
  if (known < 99.9) return "Partial ancestry";
  if (entries.length === 1 && entries[0][1] >= 99.9) return \`Pure \${entries[0][0]}\`;
  return "Mixed subspecies ancestry";
}`;

if (source.includes(oldAncestryLabel)) {
  source = source.replace(oldAncestryLabel, newAncestryLabel);
  changed = true;
} else if (!source.includes('return "Partial ancestry"')) {
  throw new Error("Could not find ancestryLabel() in GtpFamilyTreeMaker.tsx");
}

if (changed) fs.writeFileSync(file, source);
console.log("Fixed one-known-parent and unavailable-parent ancestry handling in GTP family tree.");
