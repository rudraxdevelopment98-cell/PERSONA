import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PERSONA 90",
    short_name: "PERSONA 90",
    description: "A 90-day programme to build confidence, communication and decision-making.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F6F8",
    theme_color: "#26364A",
    categories: ["education", "lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's session", url: "/today" },
      { name: "AI Coach", url: "/coach" },
      { name: "Journal", url: "/journal" },
    ],
  };
}
