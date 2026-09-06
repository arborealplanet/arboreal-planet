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
