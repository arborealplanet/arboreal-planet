import fs from "node:fs";
import { spawnSync } from "node:child_process";

const patches = [
  "scripts/materialize-assets.mjs",
  "scripts/materialize-chondro-game-assets.mjs",
  "scripts/patch-chondro-breeding-flow.mjs",
  "scripts/cleanup-product-copy.mjs",
  "scripts/patch-chondro-map-highlight.mjs",
  "scripts/patch-chondro-screen-mode.mjs",
  "scripts/patch-chondro-store-standalone.mjs",
  "scripts/patch-chondro-save-events.mjs",
  "scripts/patch-chondro-focused-screens.mjs",
  "scripts/patch-chondro-player-market-screen.mjs",
  "scripts/patch-chondro-clutch-action-bridge.mjs",
  "scripts/patch-chondro-nav-and-neonate-colors.mjs",
  "scripts/patch-chondro-reset-safety.mjs",
  "scripts/patch-chondro-visual-assets.mjs",
];

for (const patch of patches) {
  process.stdout.write(`\n[Chondro setup] ${patch}\n`);
  const result = spawnSync(process.execPath, [patch], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[Chondro setup] Could not start ${patch}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[Chondro setup] ${patch} failed with exit code ${result.status ?? "unknown"}.`);
    process.exit(result.status ?? 1);
  }
}

const checks = [
  {
    file: "src/components/ChondroBreederGameV3.tsx",
    markers: [
      'type BreedingStage = "cycling" | "pairing" | "development" | "incubation";',
      "const latestSaveRef = useRef<GameSave | null>(null);",
      "CLUTCH_ESTABLISH_BASE_COST",
      "Incubation complete. The clutch hatched and now needs to be established.",
    ],
  },
  {
    file: "src/components/ChondroBreederWorkspace.tsx",
    markers: [
      'import { ChondroBreederHomeStatus } from "@/components/ChondroBreederHomeStatus";',
      'import { ChondroGameNotifications } from "@/components/ChondroGameNotifications";',
      'import { ChondroBreederNavIcon } from "@/components/ChondroBreederNavIcon";',
      'import { ChondroClutchStageArt } from "@/components/ChondroClutchStageArt";',
      'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";',
      "<ChondroColonyOverview />",
    ],
  },
  {
    file: "src/components/ChondroBreederExpandedShop.tsx",
    markers: [
      'subspecies === "Morelia viridis" ? "Yellow"',
    ],
  },
];

for (const check of checks) {
  const source = fs.readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!source.includes(marker)) {
      console.error(`\n[Chondro setup] Validation failed: ${check.file} is missing expected output:\n${marker}`);
      process.exit(1);
    }
  }
}

console.log("\n[Chondro setup] All materializers, compatibility patches and output validations completed successfully.");
