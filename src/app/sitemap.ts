import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE.url}${path}`,
    changeFrequency: "weekly",
    priority,
  });
  return [page("", 1), page("/whitelist", 0.9), page("/pile", 0.6), page("/moods", 0.6)];
}
