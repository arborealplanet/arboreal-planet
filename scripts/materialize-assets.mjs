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

const appAssets = [
  ["arboreal-planet-logo", "public/branding/arboreal-planet-logo.webp", 103602],
  ["arboreal-planet-logo-compact", "public/branding/arboreal-planet-logo-compact.webp", 106938],
  ["arboreal-planet-app-icon", "public/branding/arboreal-planet-app-icon.webp", 16294],
  ["arboreal-arcade-splash", "public/branding/arboreal-arcade-splash.webp", 87670],
  ["chondro-pattern", "public/branding/chondro-pattern.webp", 250412],
  ["chondro-subspecies-map-art", "public/hatchery/chondro-subspecies-map-art.webp", 101838],
];

for (const [assetName, relativeOutput, expectedBytes] of appAssets) {
  const assetChunksDir = path.join(root, "src/lib/brand-assets/app-assets", assetName);
  const assetChunks = fs.readdirSync(assetChunksDir).sort((a, b) => a.localeCompare(b));
  const assetPayload = assetChunks
    .map((name) => fs.readFileSync(path.join(assetChunksDir, name), "utf8"))
    .join("");
  const assetBytes = Buffer.from(assetPayload, "base64");
  const assetSignature = assetBytes.subarray(0, 12).toString("ascii");

  if (!assetSignature.startsWith("RIFF") || !assetSignature.includes("WEBP")) {
    throw new Error(`${assetName} is not a valid WEBP payload.`);
  }
  if (assetBytes.length !== expectedBytes) {
    throw new Error(`${assetName} byte length mismatch: ${assetBytes.length}.`);
  }

  const assetOutput = path.join(root, relativeOutput);
  fs.mkdirSync(path.dirname(assetOutput), { recursive: true });
  fs.writeFileSync(assetOutput, assetBytes);
}

console.log(`Materialized ${appAssets.length} approved Arboreal Planet assets.`);

const homeVideoChunksDir = path.join(root, "src/lib/brand-assets/chondro-home-video");
const homeVideoChunkSpec = [
  ["00.txt", 20000],
  ["01.txt", 20000],
  ["02.txt", 20000],
  ["03.txt", 18972],
];

const homeVideoPayload = homeVideoChunkSpec
  .map(([name, expectedLength]) => {
    const chunk = fs.readFileSync(path.join(homeVideoChunksDir, name), "utf8").trim();
    if (chunk.length < expectedLength) {
      throw new Error(`${name} is shorter than the expected Chondro homepage video chunk length.`);
    }
    return chunk.slice(0, expectedLength);
  })
  .join("");

if (homeVideoPayload.length !== 78972) {
  throw new Error(`Chondro homepage video payload length mismatch: ${homeVideoPayload.length}.`);
}

const homeVideoBytes = Buffer.from(homeVideoPayload, "base64");
if (homeVideoBytes.subarray(4, 8).toString("ascii") !== "ftyp") {
  throw new Error("Chondro homepage video payload is not a valid MP4 file.");
}
if (homeVideoBytes.length !== 59229) {
  throw new Error(`Chondro homepage video byte length mismatch: ${homeVideoBytes.length}.`);
}

const homeVideoOutput = path.join(root, "public/branding/chondro-breeder-home.mp4");
fs.mkdirSync(path.dirname(homeVideoOutput), { recursive: true });
fs.writeFileSync(homeVideoOutput, homeVideoBytes);
console.log(`Materialized ${path.relative(root, homeVideoOutput)} (${homeVideoBytes.length} bytes).`);

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

const hatcheryUiAssetsDir = path.join(root, "src/lib/hatchery-ui-assets");
const hatcheryUiOutputDir = path.join(root, "public/hatchery/game");

if (fs.existsSync(hatcheryUiAssetsDir)) {
  const uiFiles = fs
    .readdirSync(hatcheryUiAssetsDir)
    .filter((name) => name.endsWith(".b64"))
    .sort((a, b) => a.localeCompare(b));

  fs.mkdirSync(hatcheryUiOutputDir, { recursive: true });

  for (const name of uiFiles) {
    const payload = fs.readFileSync(path.join(hatcheryUiAssetsDir, name), "utf8").trim();
    const imageBytes = Buffer.from(payload, "base64");
    const imageSignature = imageBytes.subarray(0, 12).toString("ascii");

    if (!imageSignature.startsWith("RIFF") || !imageSignature.includes("WEBP")) {
      throw new Error(`${name} is not a valid Chondro game WEBP payload.`);
    }

    const outputName = `${path.basename(name, ".b64")}.webp`;
    fs.writeFileSync(path.join(hatcheryUiOutputDir, outputName), imageBytes);
  }

  console.log(`Materialized ${uiFiles.length} Chondro Breeder UI art assets.`);
}
