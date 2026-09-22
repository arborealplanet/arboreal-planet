import { NextResponse } from "next/server";

export function GET(request: Request) {
  const iconUrl = new URL(
    "/branding/snake-sorter-app-icon-512.png",
    request.url
  );

  return NextResponse.redirect(iconUrl, 307);
}
