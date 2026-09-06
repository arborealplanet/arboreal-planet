import fs from "node:fs";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "src/lib/brand-assets/banner-01.ts");
const outputDir = path.join(process.cwd(), "public/branding");
const outputPath = path.join(outputDir, "snake-stocks-hero.webp");

const source = fs.readFileSync(sourcePath, "utf8");
const match = source.match(/export default\s+"([A-Za-z0-9+/=]+)";?/s);

if (!match) {
  throw new Error("Could not read the Snake Stocks banner base64 payload.");
}

const bytes = Buffer.from(match[1], "base64");
const signature = bytes.subarray(0, 12).toString("ascii");

if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
  throw new Error("Snake Stocks banner payload is not a valid WEBP file.");
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, bytes);
console.log(`Materialized ${path.relative(process.cwd(), outputPath)} (${bytes.length} bytes)`);
