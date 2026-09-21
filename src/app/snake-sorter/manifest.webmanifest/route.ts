import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    id: "/snake-sorter",
    name: "Snake Sorter",
    short_name: "Snake Sorter",
    description: "Private Green Tree Python visual identification and reference laboratory.",
    start_url: "/snake-sorter",
    scope: "/snake-sorter",
    display: "standalone",
    background_color: "#020705",
    theme_color: "#020705",
    orientation: "portrait-primary",
    categories: ["education", "utilities"],
    icons: [
      {
        src: "/branding/snake-sorter-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/branding/snake-sorter-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      }
    ]
  }, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
