import fs from "node:fs";
import path from "node:path";

const helperPath = "src/lib/arboreal-keeper-emerald-art.ts";
const publicPath = "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";
let source = fs.readFileSync(helperPath, "utf8");

const dataMatch = source.match(/const EMERALD_ATLAS = "data:image\/webp;base64,([A-Za-z0-9+/=]+)";/);
if (dataMatch) {
  const bytes = Buffer.from(dataMatch[1], "base64");
  if (bytes.length < 100000) {
    throw new Error(`[emerald-atlas] Preserved V3 atlas is suspiciously small (${bytes.length} bytes).`);
  }
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, bytes);
  source = source.replace(
    dataMatch[0],
    'const EMERALD_ATLAS = "/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";',
  );
  fs.writeFileSync(helperPath, source);
  console.log(`[emerald-atlas] Materialized ${publicPath} (${bytes.length} bytes) and switched renderer to public asset.`);
} else if (source.includes('/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp')) {
  if (!fs.existsSync(publicPath) || fs.statSync(publicPath).size < 100000) {
    throw new Error("[emerald-atlas] Renderer points at the public V3 atlas, but the file is missing or too small.");
  }
  console.log("[emerald-atlas] Public V3 atlas already materialized.");
} else {
  throw new Error("[emerald-atlas] Could not find preserved Emerald V3 atlas data or canonical public path.");
}
