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

const base64 = [
  // 0..89,999
  chunk("00"),
  chunk("01"),
  chunk("03"),
  chunk("05"),
  chunk("07"),
  chunk("09"),
  chunk("11"),
  chunk("13"),

  // 90,000..187,625
  tail("tail-00"),
  chunk("gap-108735-109499"),
  tail("tail-01"),
  tail("tail-02"),
  tail("tail-03"),
  tail("tail-04"),

  // 187,626..214,000
  chunk("gap-187626-193625"),
  chunk("gap-193626-199625"),
  chunk("gap-199626-205625"),
  chunk("gap-205626-211625"),
  chunk("gap-211626-214000"),

  // 214,001..261,991
  chunk("31"),
  chunk("gap-234000-241992"),
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
if (
  bytes.subarray(0, 4).toString("ascii") !== "RIFF" ||
  bytes.subarray(8, 12).toString("ascii") !== "WEBP"
) {
  throw new Error("[emerald-atlas] Reconstructed atlas is not a WebP RIFF container.");
}

// WebP VP8 header encodes this atlas as 960x768. The exact hash above is the
// stronger integrity check and guarantees the same approved 20-cell artwork.
fs.mkdirSync(path.dirname(atlasPath), { recursive: true });
fs.writeFileSync(atlasPath, bytes);

console.log(
  `[emerald-atlas] Reconstructed verified 960x768 V3 atlas (${bytes.length} bytes, ${sha256}).`,
);
