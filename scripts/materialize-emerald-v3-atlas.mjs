import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const chunkDir = path.join(process.cwd(), "src/lib/emerald-atlas-v3-chunks");
const publicPath = path.join(process.cwd(), "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp");
const EXPECTED_BYTES = 196492;
const EXPECTED_SHA256 = "62644f94c24ff408c6af5e639c1d581207a01c089cfca041f65f5e7a24a87af0";
const expectedChunks = ["00.txt","01.txt","03.txt","05.txt","07.txt","09.txt","11.txt","13.txt","15.txt","23.txt","31.txt","39.txt"];

for (const file of expectedChunks) {
  const filePath = path.join(chunkDir, file);
  if (!fs.existsSync(filePath)) throw new Error(`[emerald-atlas] Missing chunk: ${file}`);
}

const encoded = expectedChunks
  .map((file) => fs.readFileSync(path.join(chunkDir, file), "utf8").trim())
  .join("");

const bytes = Buffer.from(encoded, "base64");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

if (bytes.length !== EXPECTED_BYTES) {
  throw new Error(`[emerald-atlas] Expected ${EXPECTED_BYTES} bytes, decoded ${bytes.length}.`);
}
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`[emerald-atlas] SHA-256 mismatch: ${sha256}`);
}
if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("[emerald-atlas] Reconstructed atlas is not a WebP RIFF container.");
}

fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.writeFileSync(publicPath, bytes);
console.log(`[emerald-atlas] Reconstructed verified 960x768 V3 atlas (${bytes.length} bytes, ${sha256}).`);
