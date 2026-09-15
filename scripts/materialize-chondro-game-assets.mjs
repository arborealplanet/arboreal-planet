import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceDir = path.join(root, "src/lib/hatchery-assets-game");
const outputDir = path.join(root, "public/hatchery/game");

if (fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith(".b64")).sort();
  fs.mkdirSync(outputDir, { recursive: true });

  for (const name of files) {
    const payload = fs.readFileSync(path.join(sourceDir, name), "utf8").trim();
    const bytes = Buffer.from(payload, "base64");
    const signature = bytes.subarray(0, 12).toString("ascii");
    if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
      throw new Error(`${name} is not a valid Chondro game WEBP payload.`);
    }
    fs.writeFileSync(path.join(outputDir, `${path.basename(name, ".b64")}.webp`), bytes);
  }

  console.log(`Materialized ${files.length} Chondro Breeder game art assets.`);
}

const neonateSourceDir = path.join(root, "src/lib/hatchery-assets-neonates-final");
const neonateOutputDir = path.join(root, "public/hatchery/snakes/neonates");
const neonateSpecs = {
  "viridis-yellow": { base64Length: 28912, bytes: 21684 },
  "utaraensis-red": { base64Length: 28440, bytes: 21328 },
  "azurea-red": { base64Length: 27908, bytes: 20930 },
  "pulcher-red": { base64Length: 29044, bytes: 21782 },
};

if (fs.existsSync(neonateSourceDir)) {
  fs.mkdirSync(neonateOutputDir, { recursive: true });

  for (const [assetName, spec] of Object.entries(neonateSpecs)) {
    const assetDir = path.join(neonateSourceDir, assetName);
    const chunks = fs
      .readdirSync(assetDir)
      .filter((name) => name.endsWith(".txt"))
      .sort((a, b) => a.localeCompare(b));
    const payload = chunks
      .map((name) => fs.readFileSync(path.join(assetDir, name), "utf8").trim())
      .join("");

    if (payload.length !== spec.base64Length) {
      throw new Error(`${assetName} base64 length mismatch: expected ${spec.base64Length}, got ${payload.length}.`);
    }

    const bytes = Buffer.from(payload, "base64");
    const signature = bytes.subarray(0, 12).toString("ascii");
    if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
      throw new Error(`${assetName} is not a valid Chondro neonate WEBP payload.`);
    }
    if (bytes.length !== spec.bytes) {
      throw new Error(`${assetName} byte length mismatch: expected ${spec.bytes}, got ${bytes.length}.`);
    }

    fs.writeFileSync(path.join(neonateOutputDir, `${assetName}.webp`), bytes);
  }

  console.log(`Materialized ${Object.keys(neonateSpecs).length} approved Chondro neonate assets.`);
}
