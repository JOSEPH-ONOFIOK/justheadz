import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JustHeadz",
    short_name: "JustHeadz",
    description: "Heads only. No bodies, no mercy.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8d8a7",
    theme_color: "#f8d8a7",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
