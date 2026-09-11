import fs from "node:fs";

const file = "src/components/ChondroBreederWorkspace.tsx";
let source = fs.readFileSync(file, "utf8");

if (!source.includes('import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";')) {
  source = source.replace(
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\n',
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\nimport { ChondroColonyOverview } from "@/components/ChondroColonyOverview";\n',
  );
}

const needle = '      {view === "breeding" ? <ChondroBreedingFocusHeader /> : null}\n';
if (!source.includes('<ChondroColonyOverview />') && source.includes(needle)) {
  source = source.replace(
    needle,
    `${needle}      {view === "colony" ? <ChondroColonyOverview /> : null}\n`,
  );
}

fs.writeFileSync(file, source);
console.log("Added the Chondro colony overview and quick management filters.");
