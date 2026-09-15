import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arboreal Planet",
    short_name: "Arboreal Planet",
    description: "A keeper-first reptile platform for community, animal and plant reference data, genetics and pedigrees, marketplace tools, Snake Stocks market intelligence and The Hatchery breeder games.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#06100c",
    theme_color: "#06100c",
    orientation: "portrait-primary",
    categories: ["social", "education", "lifestyle"],
    icons: [
      { src: "/branding/arboreal-planet-app-icon.webp", sizes: "320x320", type: "image/webp", purpose: "any" },
      { src: "/branding/arboreal-planet-app-icon.webp", sizes: "320x320", type: "image/webp", purpose: "maskable" },
    ],
  };
}
