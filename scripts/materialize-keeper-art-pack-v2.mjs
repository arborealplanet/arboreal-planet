import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packDir = path.join(root, "src/lib/keeper-art-pack-v2");

const manifest = [
  { path: "public/hatchery/animals/emerald-tree-boas/northern/northern-sprite.webp", offset: 0, length: 96920 },
  { path: "public/hatchery/animals/emerald-tree-boas/amazon-basin/neonate-sprite.webp", offset: 96920, length: 73974 },
  { path: "public/hatchery/animals/emerald-tree-boas/amazon-basin/later-sprite.webp", offset: 170894, length: 74046 },
  { path: "public/hatchery/snakes/neonates/azurea-yellow.webp", offset: 244940, length: 39270 },
  { path: "public/hatchery/snakes/neonates/pulcher-yellow.webp", offset: 284210, length: 37956 },
  { path: "public/hatchery/snakes/neonates/utaraensis-yellow.webp", offset: 322166, length: 37216 },
];

if (!fs.existsSync(packDir)) throw new Error(`[keeper-art-v2] Missing ${path.relative(root, packDir)}.`);

const chunkFiles = fs.readdirSync(packDir)
  .filter((name) => /^\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (chunkFiles.length !== 27) {
  throw new Error(`[keeper-art-v2] Expected 27 artwork chunks; found ${chunkFiles.length}.`);
}

const encoded = chunkFiles.map((name) => fs.readFileSync(path.join(packDir, name), "utf8").trim()).join("");
const packed = Buffer.from(encoded, "base64");
const expectedBytes = manifest.reduce((sum, item) => sum + item.length, 0);
if (packed.length !== expectedBytes) {
  throw new Error(`[keeper-art-v2] Artwork pack decoded to ${packed.length} bytes; expected ${expectedBytes}.`);
}

for (const item of manifest) {
  const outputPath = path.join(root, item.path);
  const bytes = packed.subarray(item.offset, item.offset + item.length);
  if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
    throw new Error(`[keeper-art-v2] ${item.path} is not a valid WebP payload.`);
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
}

console.log(`[keeper-art-v2] Materialized ${manifest.length} corrected animal assets from ${chunkFiles.length} chunks.`);
