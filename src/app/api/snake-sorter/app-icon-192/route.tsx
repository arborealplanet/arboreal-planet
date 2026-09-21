import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const logoUrl = new URL("/branding/snake-sorter-logo.svg", request.url).toString();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#020705", padding: 12 }}>
        <img src={logoUrl} width="168" height="168" style={{ objectFit: "contain", borderRadius: 28 }} />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
