import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arboreal-planet.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/animals",
    "/arboreals-by-bunn",
    "/animals/green-tree-python",
    "/genetics",
    "/genetics/database",
    "/plants",
    "/plants/nepenthes",
    "/learn",
    "/news",
    "/episodes",
    "/events",
    "/marketplace",
    "/community",
    "/friends",
    "/arcade",
    "/arcade/arboreal-keeper",
    "/arcade/snake-sorting",
    "/search",
    "/privacy",
    "/terms",
    "/community-guidelines",
    "/support",
    "/data-controls",
    "/account-deletion",
  ];

  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/community" || path === "/marketplace" ? 0.9 : 0.7,
  }));
}
