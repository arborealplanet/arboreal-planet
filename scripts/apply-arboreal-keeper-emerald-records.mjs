import fs from "node:fs";
import path from "node:path";

const workspacePath = path.join(process.cwd(), "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[emerald-records] Expected fragment not found: ${before.slice(0, 100)}`);
    return source;
  }
  return source.replace(before, after);
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[emerald-records] Emerald workspace source not found; skipping records patch.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");

source = replaceOnce(
  source,
  'import Image from "next/image";',
  'import Image from "next/image";\nimport { ArborealKeeperEmeraldAnimalRecord } from "@/components/ArborealKeeperEmeraldAnimalRecord";',
);

source = replaceOnce(
  source,
  '  const keeperLevel = keeperLevelFromReputation(reputation);',
  `  useEffect(() => {
    function handleAnimalRecordAction(event: Event) {
      const detail = (event as CustomEvent<{ animalId?: string; field?: "name" | "notes"; value?: string }>).detail;
      if (
        !detail?.animalId ||
        (detail.field !== "name" && detail.field !== "notes") ||
        typeof detail.value !== "string"
      ) return;
      const animalId = detail.animalId;
      const field = detail.field;
      const value = detail.value;
      setSave((current) => ({
        ...current,
        animals: current.animals.map((animal) => {
          if (animal.id !== animalId) return animal;
          if (field === "name") {
            const name = value.trim().slice(0, 60);
            return { ...animal, name: name || emeraldSpeciesDisplayName(animal.speciesId) };
          }
          return { ...animal, notes: value.slice(0, 1000) };
        }),
      }));
    }
    window.addEventListener("arboreal-keeper-emerald-animal-record-action", handleAnimalRecordAction);
    return () => window.removeEventListener("arboreal-keeper-emerald-animal-record-action", handleAnimalRecordAction);
  }, []);

  const keeperLevel = keeperLevelFromReputation(reputation);`,
);

source = replaceOnce(
  source,
  '              <div className="mt-3 rounded-xl border border-white/[.05] bg-black/20 px-3 py-2 text-[10px] text-white/38">\n                Housing · {enclosure?.displayName ?? "Unassigned"}\n              </div>\n              <div className="mt-3 flex flex-wrap gap-2">',
  '              <div className="mt-3 rounded-xl border border-white/[.05] bg-black/20 px-3 py-2 text-[10px] text-white/38">\n                Housing · {enclosure?.displayName ?? "Unassigned"}\n              </div>\n              <ArborealKeeperEmeraldAnimalRecord\n                animal={animal}\n                parents={save.animals.filter((candidate) => animal.parentIds.includes(candidate.id))}\n              />\n              <div className="mt-3 flex flex-wrap gap-2">',
);

fs.writeFileSync(workspacePath, source);
console.log("[emerald-records] Added editable names, keeper notes and lineage references to Emerald animals.");
