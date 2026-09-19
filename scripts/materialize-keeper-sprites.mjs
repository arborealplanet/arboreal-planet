import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src/lib/keeper-sprite-assets");

const assets = [
  ["arfak-red-neonate", "public/hatchery/snakes/localities/arfak/red-neonate.webp"],
  ["arfak-adult", "public/hatchery/snakes/localities/arfak/adult.webp"],
  ["lereh-yellow-adult", "public/hatchery/snakes/localities/lereh/yellow-adult.webp"],
  ["wamena-viridis-red-neonate-01", "public/hatchery/snakes/hybrids/wamena-viridis/red-neonate-01.webp"],
];

for (const [assetName, outputRelative] of assets) {
  const assetDir = path.join(sourceRoot, assetName);
  if (!fs.existsSync(assetDir)) continue;

  const chunks = fs.readdirSync(assetDir)
    .filter((name) => /^\d+\.txt$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (!chunks.length) continue;

  const payload = chunks
    .map((name) => fs.readFileSync(path.join(assetDir, name), "utf8").trim())
    .join("");

  const bytes = Buffer.from(payload, "base64");
  const signature = bytes.subarray(0, 12).toString("ascii");
  if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
    throw new Error(`Keeper sprite ${assetName} did not decode to WebP.`);
  }

  const outputPath = path.join(root, outputRelative);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
  console.log(`Materialized Keeper sprite: ${outputRelative}`);
}
