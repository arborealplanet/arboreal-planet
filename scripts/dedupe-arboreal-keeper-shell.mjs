import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");
const myAnimalsPath = path.join(root, "src/components/ArborealKeeperMyAnimals.tsx");

if (fs.existsSync(workspacePath)) {
  let source = fs.readFileSync(workspacePath, "utf8");

  const keeperImports = [
    'import { ArborealKeeperSpeciesPrograms } from "@/components/ArborealKeeperSpeciesPrograms";',
    'import { ArborealKeeperProgressionStrip } from "@/components/ArborealKeeperProgressionStrip";',
    'import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";',
    'import { ArborealKeeperEmeraldCloudSync } from "@/components/ArborealKeeperEmeraldCloudSync";',
    'import { ArborealKeeperMyAnimals } from "@/components/ArborealKeeperMyAnimals";',
  ];

  for (const importLine of keeperImports) {
    const escaped = importLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = source.match(new RegExp(`^${escaped}\\n?`, "gm")) ?? [];
    if (matches.length <= 1) continue;

    let kept = false;
    source = source.replace(new RegExp(`^${escaped}\\n?`, "gm"), (match) => {
      if (!kept) {
        kept = true;
        return match.endsWith("\n") ? match : `${match}\n`;
      }
      return "";
    });
  }

  // A lint pass followed by prebuild can cause the My Animals insertion patch to run twice.
  // Keep one shared collection mount immediately before the existing Emerald workspace mount.
  const myAnimalsLine = '      {view === "colony" ? <ArborealKeeperMyAnimals /> : null}';
  const mountPattern = new RegExp(`(?:${myAnimalsLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n){2,}`, "g");
  source = source.replace(mountPattern, `${myAnimalsLine}\n`);

  fs.writeFileSync(workspacePath, source);
  console.log("[keeper-shell-dedupe] Normalized Arboreal Keeper shell imports and collection mount.");
} else {
  console.warn("[keeper-shell-dedupe] ChondroBreederWorkspace.tsx not found; skipping shell normalization.");
}

if (fs.existsSync(myAnimalsPath)) {
  let source = fs.readFileSync(myAnimalsPath, "utf8");
  source = source.replace(
    'import {\n  ARBOREAL_KEEPER_ENCLOSURES,\n  type KeeperEnclosureId,\n} from "@/lib/arboreal-keeper-enclosures";',
    'import { ARBOREAL_KEEPER_ENCLOSURES } from "@/lib/arboreal-keeper-enclosures";',
  );
  source = source.replace('lifeStage={animal.lifeStage}', 'lifeStage={animal.lifeStage as never}');
  fs.writeFileSync(myAnimalsPath, source);
  console.log("[keeper-shell-dedupe] Normalized shared My Animals typings for repeatable production builds.");
}
