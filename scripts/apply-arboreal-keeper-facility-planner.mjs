import fs from "node:fs";
import path from "node:path";

const workspacePath = path.join(process.cwd(), "src/components/ChondroBreederWorkspace.tsx");

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[keeper-facility] Expected ${label} fragment not found: ${before.slice(0, 120)}`);
    return source;
  }
  return source.replace(before, after);
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[keeper-facility] Workspace source not found; skipping facility planner mount.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");

source = replaceOnce(
  source,
  'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";',
  'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";\nimport { ArborealKeeperFacilityPlanner } from "@/components/ArborealKeeperFacilityPlanner";',
  "facility planner import",
);

source = source.replace(
  '{ id: "career", label: "Career", detail: "Facility, shows and progression", icon: "↗" }',
  '{ id: "career", label: "Facility", detail: "Rooms, enclosure builds and progression", icon: "↗" }',
);

source = replaceOnce(
  source,
  '            <ChondroBreederManagementView section="career" />',
  '            <ArborealKeeperFacilityPlanner />\n            <ChondroBreederManagementView section="career" />',
  "facility planner career mount",
);

source = source.replace(
  "Build the operation behind the breeding program.",
  "Build the shared facility behind every animal program.",
);
source = source.replace(
  "Capacity, incubation and research upgrades now have a visual home alongside the career systems.",
  "Create mixed-species rooms, install compatible enclosure shells, customize nine snap zones and save reusable cage templates alongside facility progression.",
);

fs.writeFileSync(workspacePath, source);
console.log("[keeper-facility] Mounted shared rooms and enclosure customization in the Facility screen.");
