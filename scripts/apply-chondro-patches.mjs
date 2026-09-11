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
  "scripts/patch-chondro-home-dashboard.mjs",
  "scripts/patch-chondro-nav-and-neonate-colors.mjs",
  "scripts/patch-chondro-reset-safety.mjs",
  "scripts/patch-chondro-visual-assets.mjs",
  "scripts/patch-chondro-colony-overview.mjs",
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

console.log("\n[Chondro setup] All materializers and compatibility patches completed successfully.");
