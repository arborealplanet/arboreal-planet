import type { NextConfig } from "next";

// The independent Arboreals By Bunn static site is mounted under one removable prefix.
// Cutover (2026-10-08, owner-authorized): the arcade now lives as a standalone
// app. Planet's /arcade/* pages go through the login handoff, which signs the
// player into the Arcade (when Planet-logged-in) and lands them on the game.
// Temporary (307) so removing this block instantly restores the embedded
// arcade — nothing was deleted.
// Snake Sorter (2026-10-10, owner-authorized): the sorter tool now lives as a
// standalone app at https://snake-sorter.vercel.app. Planet's /snake-sorter/*
// pages redirect there. Temporary (307) so removing this block instantly
// restores the embedded tool — nothing was deleted.
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/arcade/:path*",
        destination: "/api/arcade/handoff?next=/arcade/:path*",
        permanent: false,
      },
      {
        source: "/snake-sorter/:path*",
        destination: "https://snake-sorter.vercel.app/:path*",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/arboreals-by-bunn", destination: "/abb-site/index.html" },
        { source: "/arboreals-by-bunn/:page(about|animals|enclosures|dojo|first-clutch|contact)", destination: "/abb-site/:page/index.html" },
        { source: "/arboreals-by-bunn/enclosures/:product(neonate|sub-adult|adult|breeder)", destination: "/abb-site/enclosures/:product/index.html" },
        { source: "/arboreals-by-bunn/assets/:asset*", destination: "/abb-site/assets/:asset*" },
        { source: "/arboreals-by-bunn/styles.css", destination: "/abb-site/styles.css" },
        { source: "/arboreals-by-bunn/app.js", destination: "/abb-site/app.js" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
