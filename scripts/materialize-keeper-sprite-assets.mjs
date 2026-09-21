import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const assets = [
  {
    sourceDir: "src/lib/keeper-sprite-assets/manokwari-yellow-adult",
    output: "public/hatchery/snakes/localities/manokwari/yellow-adult.webp",
  },
  {
    sourceDir: "src/lib/keeper-sprite-assets/wamena-red-neonate-clean",
    output: "public/hatchery/snakes/localities/wamena/red-neonate-clean.webp",
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

const keeperLoadingDir = path.join(
  root,
  "src/lib/brand-assets/app-assets/arboreal-keeper-loading",
);

if (fs.existsSync(keeperLoadingDir)) {
  const parts = fs.readdirSync(keeperLoadingDir)
    .filter((name) => /^\d+\.txt$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (parts.length) {
    const b64 = parts
      .map((name) => fs.readFileSync(path.join(keeperLoadingDir, name), "utf8").trim())
      .join("");

    const bytes = Buffer.from(b64, "base64");
    const signature = bytes.subarray(4, 12).toString("ascii");

    if (!signature.includes("ftyp")) {
      throw new Error("Invalid Arboreal Keeper MP4 loading asset.");
    }

    const out = path.join(root, "public/branding/arboreal-keeper-loading.mp4");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, bytes);
    console.log(`Materialized Keeper loading animation: public/branding/arboreal-keeper-loading.mp4 (${bytes.length} bytes)`);
  }
}
