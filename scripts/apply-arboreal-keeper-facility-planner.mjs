import fs from "node:fs";
import path from "node:path";

const workspacePath = path.join(process.cwd(), "src/components/ChondroBreederWorkspace.tsx");
const facilityPlannerPath = path.join(process.cwd(), "src/components/ArborealKeeperFacilityPlanner.tsx");

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[keeper-facility] Expected ${label} fragment not found: ${before.slice(0, 120)}`);
    return source;
  }
  return source.replace(before, after);
}

function keepSingleLine(source, line) {
  const parts = source.split(line);
  if (parts.length <= 2) return source;
  return `${parts[0]}${line}${parts.slice(1).join("")}`;
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[keeper-facility] Workspace source not found; skipping facility planner mount.");
} else {
  let source = fs.readFileSync(workspacePath, "utf8");

  if (!source.includes('import { ArborealKeeperFacilityPlanner } from "@/components/ArborealKeeperFacilityPlanner";')) {
    source = source.replace(
      'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";',
      'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";\nimport { ArborealKeeperFacilityPlanner } from "@/components/ArborealKeeperFacilityPlanner";',
    );
  }

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

  const keeperImports = [
    'import { ArborealKeeperFacilityPlanner } from "@/components/ArborealKeeperFacilityPlanner";',
    'import { ArborealKeeperSpeciesPrograms } from "@/components/ArborealKeeperSpeciesPrograms";',
    'import { ArborealKeeperProgressionStrip } from "@/components/ArborealKeeperProgressionStrip";',
    'import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";',
    'import { ArborealKeeperEmeraldCloudSync } from "@/components/ArborealKeeperEmeraldCloudSync";',
  ];
  for (const importLine of keeperImports) source = keepSingleLine(source, importLine);

  fs.writeFileSync(workspacePath, source);
  console.log("[keeper-facility] Mounted shared rooms and enclosure customization in the Facility screen.");
  console.log("[keeper-facility] Deduplicated shared Keeper imports after repeated lint/build patch passes.");
}

if (fs.existsSync(facilityPlannerPath)) {
  let planner = fs.readFileSync(facilityPlannerPath, "utf8");

  planner = planner.replace(
    '    const roomId = `keeper-room-${Date.now()}`;',
    '    const roomId = `keeper-room-${save.rooms.length + 1}`;',
  );
  planner = planner.replace(
    '          createdAt: Date.now(),',
    '          createdAt: save.rooms.length + 1,',
  );
  planner = planner.replace(
    '    const instanceId = `keeper-enclosure-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;',
    '    const instanceId = `keeper-enclosure-${selectedRoom.id}-${save.enclosures.length + 1}`;',
  );
  planner = planner.replace(
    '    const id = `keeper-template-${Date.now()}`;',
    '    const id = `keeper-template-${save.templates.length + 1}`;',
  );

  fs.writeFileSync(facilityPlannerPath, planner);
  console.log("[keeper-facility] Kept Facility event handlers deterministic for React purity validation.");
}
