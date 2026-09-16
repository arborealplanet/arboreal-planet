import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = [
  path.join(root, "src/components/ArborealKeeperEmeraldMarketBar.tsx"),
  path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx"),
];

const oldLine = `    backgroundImage: 'url("' + animal.assetPath + '")',`;
const newLine = `    backgroundImage: 'url("' + (id.startsWith("etb_northern_") ? "/hatchery/animals/emerald-tree-boas/northern/northern-sprite.webp" : id.startsWith("etb_basin_neonate_") ? "/hatchery/animals/emerald-tree-boas/amazon-basin/neonate-sprite.webp" : "/hatchery/animals/emerald-tree-boas/amazon-basin/later-sprite.webp") + '")',`;

for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("function emeraldSpriteStyle")) continue;
  if (!source.includes(oldLine)) {
    console.log(`[keeper-emerald-sprites] ${path.basename(file)} already uses canonical sprite paths.`);
    continue;
  }
  fs.writeFileSync(file, source.replace(oldLine, newLine));
  console.log(`[keeper-emerald-sprites] ${path.basename(file)} now ignores stale saved PNG paths and uses committed WebP sprites.`);
}
