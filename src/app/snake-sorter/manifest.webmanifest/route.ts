import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    id: "/snake-sorter",
    name: "Snake Sorter",
    short_name: "Snake Sorter",
    description: "Private Green Tree Python visual identification and reference laboratory.",
    start_url: "/snake-sorter?app=snake-sorter",
    scope: "/snake-sorter",
    display: "standalone",
    display_override: ["standalone"],
    prefer_related_applications: false,
    background_color: "#020705",
    theme_color: "#020705",
    orientation: "portrait-primary",
    categories: ["education", "utilities"],
    icons: [
      {
        src: "/api/snake-sorter/app-icon-192",
        sizes: "192x192",
        type: "image/webp",
        purpose: "any"
      },
      {
        src: "/branding/snake-sorter-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/branding/snake-sorter-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  }, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}
