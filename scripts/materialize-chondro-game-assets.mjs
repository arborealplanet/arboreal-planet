import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "src/lib/hatchery-assets-game");
const outputDir = path.join(root, "public/hatchery/game");

if (!fs.existsSync(sourceDir)) process.exit(0);

const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith(".b64")).sort();
fs.mkdirSync(outputDir, { recursive: true });

for (const name of files) {
  const payload = fs.readFileSync(path.join(sourceDir, name), "utf8").trim();
  const bytes = Buffer.from(payload, "base64");
  const signature = bytes.subarray(0, 12).toString("ascii");
  if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
    throw new Error(`${name} is not a valid Chondro game WEBP payload.`);
  }
  fs.writeFileSync(path.join(outputDir, `${path.basename(name, ".b64")}.webp`), bytes);
}

console.log(`Materialized ${files.length} Chondro Breeder game art assets.`);
