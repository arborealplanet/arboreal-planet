import fs from "node:fs";

const shellPath = "src/components/ArborealKeeperWorkspace.tsx";
const homePath = "src/components/ChondroBreederWorkspace.tsx";

if (!fs.existsSync(shellPath) || !fs.existsSync(homePath)) {
  console.log("[keeper-home-order] Required Arboreal Keeper files not found; skipped.");
  process.exit(0);
}

let shell = fs.readFileSync(shellPath, "utf8");
let home = fs.readFileSync(homePath, "utf8");

shell = shell.replace('import { ArborealKeeperProgramHub } from "@/components/ArborealKeeperProgramHub";\n', "");
shell = shell.replace("      <ArborealKeeperProgramHub />\n", "");

if (!home.includes('import { ArborealKeeperProgramHub } from "@/components/ArborealKeeperProgramHub";')) {
  home = home.replace(
    'import { ArborealPlanetMark } from "@/components/BrandVisuals";\n',
    'import { ArborealPlanetMark } from "@/components/BrandVisuals";\nimport { ArborealKeeperProgramHub } from "@/components/ArborealKeeperProgramHub";\n',
  );
}

// Remove any prior misplaced Home-hub mount so the insertion stays idempotent.
home = home.replace(/\n\s*<ArborealKeeperProgramHub \/>\n/g, "\n");

const heroAnchor = `          </section>\n\n          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />`;
const heroWithHub = `          </section>\n\n          <ArborealKeeperProgramHub />\n\n          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />`;

if (!home.includes(heroAnchor)) {
  throw new Error("[keeper-home-order] Could not find the Home hero insertion point.");
}
home = home.replace(heroAnchor, heroWithHub);

fs.writeFileSync(shellPath, shell);
fs.writeFileSync(homePath, home);
console.log("[keeper-home-order] Moved the Arboreal Keeper shared section below the Home hero.");
