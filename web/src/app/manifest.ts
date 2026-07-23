import type { MetadataRoute } from "next";

const tagline = "一起存，一起花，一起在異世界探險吧!";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mimic",
    short_name: "mimic",
    description: `咪咪庫 / Mimiku - ${tagline}`,
    lang: "zh-Hant",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf0",
    theme_color: "#f4bd32",
    categories: ["finance", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
