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

// The approved juvenile portraits are stored as text chunks because the
// repository connector cannot directly upload binary files. Reassemble them
// during builds, but never fail the whole game if one optional replacement is
// malformed; the checked-in portrait remains as a safe fallback.
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
    try {
      const assetDir = path.join(neonateSourceDir, assetName);
      if (!fs.existsSync(assetDir)) throw new Error("asset chunk directory is missing");
      const chunks = fs.readdirSync(assetDir).filter((name) => name.endsWith(".txt")).sort((a, b) => a.localeCompare(b));
      if (!chunks.length) throw new Error("no asset chunks found");
      const payload = chunks.map((name) => fs.readFileSync(path.join(assetDir, name), "utf8").trim()).join("");
      if (payload.length !== spec.base64Length) throw new Error(`base64 length expected ${spec.base64Length}, got ${payload.length}`);

      const bytes = Buffer.from(payload, "base64");
      const signature = bytes.subarray(0, 12).toString("ascii");
      if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) throw new Error("decoded payload is not WEBP");
      if (bytes.length !== spec.bytes) throw new Error(`byte length expected ${spec.bytes}, got ${bytes.length}`);

      fs.writeFileSync(path.join(neonateOutputDir, `${assetName}.webp`), bytes);
      console.log(`Materialized sharper juvenile portrait: ${assetName}.webp`);
    } catch (error) {
      console.warn(`Keeping checked-in juvenile portrait for ${assetName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
