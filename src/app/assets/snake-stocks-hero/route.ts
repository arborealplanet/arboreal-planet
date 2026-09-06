import snakeStocksBannerBase64 from "@/lib/brand-assets/banner-01";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const bytes = Buffer.from(snakeStocksBannerBase64, "base64");

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
