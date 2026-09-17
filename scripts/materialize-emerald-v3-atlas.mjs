import fs from "node:fs";
import path from "node:path";

const helperPath = "src/lib/arboreal-keeper-emerald-art.ts";
const publicPath = "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";
let source = fs.readFileSync(helperPath, "utf8");

const marker = "data:image/webp;base64,";
const markerIndex = source.indexOf(marker);

if (markerIndex >= 0) {
  const dataStart = markerIndex + marker.length;
  const quoteIndex = source.indexOf('"', dataStart);
  if (quoteIndex < 0) {
    throw new Error("[emerald-atlas] Found embedded V3 atlas marker but could not find its closing quote.");
  }

  const encoded = source.slice(dataStart, quoteIndex).replace(/\s+/g, "");
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length < 100000) {
    throw new Error(`[emerald-atlas] Preserved V3 atlas is suspiciously small (${bytes.length} bytes).`);
  }
  if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
    throw new Error("[emerald-atlas] Preserved V3 atlas did not decode to a valid WebP container.");
  }

  fs.mkdirSync(path.dirname(publicPath), { recursive: true });
  fs.writeFileSync(publicPath, bytes);

  const declarationStart = source.lastIndexOf("const EMERALD_ATLAS", markerIndex);
  const declarationEnd = source.indexOf(";", quoteIndex);
  if (declarationStart < 0 || declarationEnd < 0) {
    throw new Error("[emerald-atlas] Could not locate the EMERALD_ATLAS declaration around embedded artwork.");
  }

  source =
    source.slice(0, declarationStart) +
    'const EMERALD_ATLAS = "/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";' +
    source.slice(declarationEnd + 1);
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
