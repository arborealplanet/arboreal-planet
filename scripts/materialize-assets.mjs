import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const chunksDir = path.join(root, "src/lib/brand-assets/banner-chunks");
const outputDir = path.join(root, "public/branding");
const outputPath = path.join(outputDir, "snake-stocks-hero.webp");

const chunkFiles = fs
  .readdirSync(chunksDir)
  .filter((name) => /^\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b));

if (chunkFiles.length !== 9) {
  throw new Error(`Expected 9 Snake Stocks banner chunks, found ${chunkFiles.length}.`);
}

const base64 = chunkFiles
  .map((name) => fs.readFileSync(path.join(chunksDir, name), "utf8").trim())
  .join("");

if (base64.length !== 51952) {
  throw new Error(`Snake Stocks banner payload length mismatch: ${base64.length}.`);
}

const bytes = Buffer.from(base64, "base64");
const signature = bytes.subarray(0, 12).toString("ascii");

if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
  throw new Error("Snake Stocks banner payload is not a valid WEBP file.");
}

if (bytes.length !== 38964) {
  throw new Error(`Snake Stocks banner byte length mismatch: ${bytes.length}.`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, bytes);
console.log(`Materialized ${path.relative(root, outputPath)} from ${chunkFiles.length} verified chunks (${bytes.length} bytes)`);

const hatcheryAssetsDir = path.join(root, "src/lib/hatchery-assets");
const hatcheryOutputDir = path.join(root, "public/hatchery/snakes/traits");

if (fs.existsSync(hatcheryAssetsDir)) {
  const hatcheryFiles = fs
    .readdirSync(hatcheryAssetsDir)
    .filter((name) => name.endsWith(".b64"))
    .sort((a, b) => a.localeCompare(b));

  fs.mkdirSync(hatcheryOutputDir, { recursive: true });

  for (const name of hatcheryFiles) {
    const payload = fs.readFileSync(path.join(hatcheryAssetsDir, name), "utf8").trim();
    const imageBytes = Buffer.from(payload, "base64");
    const imageSignature = imageBytes.subarray(0, 12).toString("ascii");

    if (!imageSignature.startsWith("RIFF") || !imageSignature.includes("WEBP")) {
      throw new Error(`${name} is not a valid WEBP payload.`);
    }

    const outputName = `${path.basename(name, ".b64")}.webp`;
    fs.writeFileSync(path.join(hatcheryOutputDir, outputName), imageBytes);
  }

  console.log(`Materialized ${hatcheryFiles.length} Chondro Breeder trait icons.`);
}
