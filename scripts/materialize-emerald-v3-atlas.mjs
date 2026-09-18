import fs from "node:fs";
import crypto from "node:crypto";

const atlasPath = "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";
const EXPECTED_BYTES = 196492;
const EXPECTED_SHA256 = "62644f94c24ff408c6af5e639c1d581207a01c089cfca041f65f5e7a24a87af0";

if (!fs.existsSync(atlasPath)) {
  throw new Error("[emerald-atlas] Verified V3 atlas binary is missing from public assets.");
}

const bytes = fs.readFileSync(atlasPath);
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

if (bytes.length !== EXPECTED_BYTES) {
  throw new Error(`[emerald-atlas] Expected ${EXPECTED_BYTES} bytes, found ${bytes.length}.`);
}
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`[emerald-atlas] SHA-256 mismatch: ${sha256}`);
}
if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("[emerald-atlas] Verified atlas is not a WebP RIFF container.");
}

console.log(`[emerald-atlas] Verified 960x768 V3 atlas (${bytes.length} bytes, ${sha256}).`);
