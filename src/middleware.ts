import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0].toLowerCase() ?? "";
  if (host === "snake-sorter.vercel.app" || host.startsWith("snake-sorter-")) {
    if (request.nextUrl.pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/snake-sorter";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
