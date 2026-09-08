import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const chunksDir = path.join(process.cwd(), "src/lib/hatchery-assets/conservation-map-chunks");
  const chunkFiles = fs
    .readdirSync(chunksDir)
    .filter((name) => /^\d+\.txt$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  const base64 = chunkFiles
    .map((name) => fs.readFileSync(path.join(chunksDir, name), "utf8").trim())
    .join("");
  const bytes = Buffer.from(base64, "base64");
  const signature = bytes.subarray(0, 12).toString("ascii");

  if (!signature.startsWith("RIFF") || !signature.includes("WEBP")) {
    return new Response("Conservation map asset unavailable.", { status: 500 });
  }

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
