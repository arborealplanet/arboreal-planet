import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const atlasPath = "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";
const EXPECTED_BASE64 = 261992;
const EXPECTED_BYTES = 196492;
const EXPECTED_SHA256 = "62644f94c24ff408c6af5e639c1d581207a01c089cfca041f65f5e7a24a87af0";

function readText(file) {
  if (!fs.existsSync(file)) throw new Error(`[emerald-atlas] Missing chunk: ${file}`);
  return fs.readFileSync(file, "utf8").trim();
}

const chunk = (name) => readText(`src/lib/emerald-atlas-v3-chunks/${name}.txt`);
const tail = (name) => readText(`src/lib/emerald-atlas-v3-tail/${name}.txt`);
const missing = (offset) => readText(`src/lib/emerald-atlas-v3-missing/${offset}.txt`);

const base64 = [
  chunk("00"),
  chunk("01"),
  chunk("03"),
  chunk("05"),
  chunk("07"),
  chunk("09"),
  chunk("11"),
  chunk("13"),
  tail("tail-00").slice(0, 18000),
  chunk("gap-108000-109499"),
  tail("tail-01"),
  tail("tail-02"),
  tail("tail-03"),
  chunk("23").slice(1999),
  missing("186000"),
  missing("188000"),
  missing("190000"),
  missing("192000"),
  missing("194000"),
  missing("196000"),
  missing("198000"),
  missing("200000"),
  missing("202000"),
  missing("204000"),
  missing("206000"),
  missing("208000"),
  missing("210000"),
  missing("212000"),
  missing("214000"),
  chunk("31"),
  missing("234000"),
  missing("236000"),
  missing("238000"),
  missing("240000"),
  chunk("39"),
].join("");

if (base64.length !== EXPECTED_BASE64) {
  throw new Error(`[emerald-atlas] Expected ${EXPECTED_BASE64} Base64 chars, found ${base64.length}.`);
}

const bytes = Buffer.from(base64, "base64");
const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

if (bytes.length !== EXPECTED_BYTES) {
  throw new Error(`[emerald-atlas] Expected ${EXPECTED_BYTES} bytes, found ${bytes.length}.`);
}
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`[emerald-atlas] SHA-256 mismatch: ${sha256}`);
}
if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
  throw new Error("[emerald-atlas] Reconstructed atlas is not a WebP RIFF container.");
}

fs.mkdirSync(path.dirname(atlasPath), { recursive: true });
fs.writeFileSync(atlasPath, bytes);

console.log(`[emerald-atlas] Reconstructed verified 960x768 V3 atlas (${bytes.length} bytes, ${sha256}).`);
