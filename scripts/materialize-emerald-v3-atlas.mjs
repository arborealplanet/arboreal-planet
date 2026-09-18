import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const atlasPath = "public/hatchery/animals/emerald-tree-boas/emerald-atlas-v3.webp";
const EXPECTED_BYTES = 196492;
const EXPECTED_SHA256 = "62644f94c24ff408c6af5e639c1d581207a01c089cfca041f65f5e7a24a87af0";

function readText(file) {
  if (!fs.existsSync(file)) throw new Error(`[emerald-atlas] Missing chunk: ${file}`);
  return fs.readFileSync(file, "utf8").trim();
}

const chunk = (name) => readText(`src/lib/emerald-atlas-v3-chunks/${name}.txt`);
const tail = (name) => readText(`src/lib/emerald-atlas-v3-tail/${name}.txt`);

// The atlas upload was interrupted several times. Some stored pieces are exact
// slices of the atlas's global Base64 string, while tail-* files are complete
// Base64 encodings of binary byte ranges. Reconstruct bytes according to the
// verified offsets rather than concatenating every text file blindly.

// Base64 chars 0..89999 => binary bytes 0..67499.
const headBytes = Buffer.from(
  [
    chunk("00"),
    chunk("01"),
    chunk("03"),
    chunk("05"),
    chunk("07"),
    chunk("09"),
    chunk("11"),
    chunk("13"),
  ].join(""),
  "base64",
);

// Independently encoded binary pieces.
// tail-00: bytes 67500..81548
// gap-108000-109499: bytes 81000..82124; only bytes 81549..82124 are needed.
// tail-01: bytes 82125..96749
// tail-02: bytes 96750..111374
// tail-03: bytes 111375..125999
// tail-04: bytes 126000..140717
const tail00 = Buffer.from(tail("tail-00"), "base64");
const bridge = Buffer.from(chunk("gap-108000-109499"), "base64").subarray(549);
const tail01 = Buffer.from(tail("tail-01"), "base64");
const tail02 = Buffer.from(tail("tail-02"), "base64");
const tail03 = Buffer.from(tail("tail-03"), "base64");
const tail04 = Buffer.from(tail("tail-04"), "base64");

// Binary byte 140718 begins at global Base64 character 187624. The two chars
// "Gz" precede the first uploaded exact gap and restore quartet alignment.
// Everything after that point is stored as exact global Base64 slices.
const suffixBase64 = [
  "Gz",
  chunk("gap-187626-193625"),
  chunk("gap-193626-199625"),
  chunk("gap-199626-205625"),
  chunk("gap-205626-211625"),
  chunk("gap-211626-214000"),
  chunk("31"),
  chunk("gap-234000-241992"),
  chunk("39"),
].join("");
const suffixBytes = Buffer.from(suffixBase64, "base64");

const bytes = Buffer.concat([
  headBytes,
  tail00,
  bridge,
  tail01,
  tail02,
  tail03,
  tail04,
  suffixBytes,
]);

const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");

if (headBytes.length !== 67500) {
  throw new Error(`[emerald-atlas] Head length mismatch: ${headBytes.length}`);
}
if (tail00.length !== 14049 || bridge.length !== 576) {
  throw new Error(`[emerald-atlas] First tail/bridge mismatch: ${tail00.length}/${bridge.length}`);
}
for (const [label, part, expected] of [
  ["tail-01", tail01, 14625],
  ["tail-02", tail02, 14625],
  ["tail-03", tail03, 14625],
  ["tail-04", tail04, 14718],
  ["suffix", suffixBytes, 55774],
]) {
  if (part.length !== expected) {
    throw new Error(`[emerald-atlas] ${label} length mismatch: ${part.length}, expected ${expected}`);
  }
}

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

fs.mkdirSync(path.dirname(atlasPath), { recursive: true });
fs.writeFileSync(atlasPath, bytes);

console.log(
  `[emerald-atlas] Reconstructed verified 960x768 V3 atlas (${bytes.length} bytes, ${sha256}).`,
);
