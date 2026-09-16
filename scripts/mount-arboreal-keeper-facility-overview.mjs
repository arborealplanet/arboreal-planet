import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");

if (!fs.existsSync(workspacePath)) {
  console.warn("[keeper-facility] ChondroBreederWorkspace.tsx not found; skipping facility mount.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");
const importLine = 'import { ArborealKeeperFacilityOverview } from "@/components/ArborealKeeperFacilityOverview";';

if (!source.includes(importLine)) {
  const anchor = 'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";';
  if (!source.includes(anchor)) {
    throw new Error("[keeper-facility] Could not find workspace import anchor.");
  }
  source = source.replace(anchor, `${anchor}\n${importLine}`);
}

const mount = "            <ArborealKeeperFacilityOverview />";
if (!source.includes(mount)) {
  const anchor = '            <ChondroBreederManagementView section="career" />';
  if (!source.includes(anchor)) {
    throw new Error("[keeper-facility] Could not find Career management mount anchor.");
  }
  source = source.replace(anchor, `${mount}\n${anchor}`);
}

fs.writeFileSync(workspacePath, source);
console.log("[keeper-facility] Mounted shared facility overview in the Career screen.");
