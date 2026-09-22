import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const logoUrl = new URL("/branding/snake-sorter-logo.svg", request.url).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020705",
          padding: "28px",
        }}
      >
        <img
          src={logoUrl}
          width="456"
          height="456"
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    }
  );
}
