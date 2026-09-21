import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const logoUrl = new URL("/api/snake-sorter/app-icon-192", request.url).toString();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#020705" }}>
        <img src={logoUrl} width="512" height="512" style={{ objectFit: "cover" }} />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
