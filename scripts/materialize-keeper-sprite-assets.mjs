import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const assets = [
  {
    sourceDir: "src/lib/keeper-sprite-assets/manokwari-yellow-adult",
    output: "public/hatchery/snakes/localities/manokwari/yellow-adult.webp",
  },
];

for (const asset of assets) {
  const dir = path.join(root, asset.sourceDir);
  if (!fs.existsSync(dir)) continue;

  const parts = fs.readdirSync(dir)
    .filter((name) => /^\d+\.txt$/.test(name))
    .sort((a,b) => a.localeCompare(b));

  if (!parts.length) continue;

  const b64 = parts
    .map((name) => fs.readFileSync(path.join(dir, name), "utf8").trim())
    .join("");

  const bytes = Buffer.from(b64, "base64");
  if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
    throw new Error(`Invalid WebP payload for ${asset.output}`);
  }

  const out = path.join(root, asset.output);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, bytes);
  console.log(`Materialized Keeper sprite: ${asset.output}`);
}
