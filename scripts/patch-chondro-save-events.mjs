import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

if (source.includes('new Event("arboreal-chondro-breeder-save-change")')) {
  console.log("Chondro Breeder save-change event already applied.");
  process.exit(0);
}

const needle = `      try {
        window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(save));
      } catch {}
      if (cloudSave)`;

const replacement = `      try {
        window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(save));
        window.dispatchEvent(new Event("arboreal-chondro-breeder-save-change"));
      } catch {}
      if (cloudSave)`;

if (!source.includes(needle)) throw new Error("Could not locate breeder save persistence block.");
source = source.replace(needle, replacement);
fs.writeFileSync(file, source);
console.log("Applied Chondro Breeder save-change event broadcast.");
