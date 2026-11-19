import type { MetadataRoute } from "next";

type Manifest = MetadataRoute.Manifest & { launch_handler?: { client_mode: string } };

export default function manifest(): Manifest {
  return {
    id: "/",
    name: "PERSONA 90",
    short_name: "PERSONA 90",
    description: "90 days of interactive stories, practice and coaching to build confidence, communication and decision-making.",
    start_url: "/dashboard?src=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#F5F6F8",
    theme_color: "#26364A",
    lang: "en-IN",
    dir: "ltr",
    categories: ["education", "lifestyle", "health", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Shown in the browser's richer install dialog.
    screenshots: [
      { src: "/screenshots/calm.png", sizes: "780x1688", type: "image/png", form_factor: "narrow", label: "Calm Corner for stressful moments" },
    ],
    shortcuts: [
      { name: "Today's session", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Calm Corner", url: "/calm", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "AI Coach", url: "/coach", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Journal", url: "/journal", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    // Opening the app again focuses the window that is already open.
    launch_handler: { client_mode: "focus-existing" },
  };
}
