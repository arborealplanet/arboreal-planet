import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const chunksDir = path.join(root, "src/lib/arboreal-keeper-asset-data/basin-sprite");
const outputPath = path.join(
  root,
  "public/hatchery/animals/emerald-tree-boas/amazon-basin/basin-sprite.webp",
);

if (!fs.existsSync(chunksDir)) {
  console.warn("[keeper-boa-assets] Basin sprite chunks are not present; skipping materialization.");
  process.exit(0);
}

const chunks = fs
  .readdirSync(chunksDir)
  .filter((name) => /^\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b));

if (chunks.length !== 10) {
  throw new Error(`[keeper-boa-assets] Expected 10 Basin sprite chunks, found ${chunks.length}.`);
}

const payload = chunks
  .map((name) => fs.readFileSync(path.join(chunksDir, name), "utf8").trim())
  .join("");

if (payload.length !== 144416) {
  throw new Error(`[keeper-boa-assets] Basin sprite base64 length mismatch: ${payload.length}.`);
}

const bytes = Buffer.from(payload, "base64");
const signature = bytes.subarray(0, 12).toString("ascii");
if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
  throw new Error("[keeper-boa-assets] Basin sprite payload is not a valid WEBP file.");
}
if (bytes.length !== 108312) {
  throw new Error(`[keeper-boa-assets] Basin sprite byte length mismatch: ${bytes.length}.`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, bytes);
console.log(`[keeper-boa-assets] Materialized ${path.relative(root, outputPath)} (${bytes.length} bytes).`);
