import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listModelsAndPlatforms } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

interface SitemapPostRow {
  slug: string;
  created_at: string;
}

async function listSitemapPosts(limit = 5000): Promise<SitemapPostRow[]> {
  const supabase = await createClient();
  // Includes both image and video prompt detail pages — every published
  // post gets an indexable canonical URL.
  const { data, error } = await supabase
    .from("posts")
    .select("slug, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as SitemapPostRow[];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [{ models, platforms }, posts] = await Promise.all([
    listModelsAndPlatforms(),
    listSitemapPosts(),
  ]);

  const out: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
  ];

  for (const m of models) {
    if (m.slug === "other") continue;
    out.push({
      url: `${SITE_URL}/${m.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const p of platforms) {
    if (p.slug === "other") continue;
    out.push({
      url: `${SITE_URL}/${p.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }

  for (const m of models) {
    if (m.slug === "other") continue;
    for (const p of platforms) {
      if (p.slug === "other") continue;
      out.push({
        url: `${SITE_URL}/${m.slug}/${p.slug}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.6,
      });
    }
  }

  for (const post of posts) {
    out.push({
      url: `${SITE_URL}/prompt/${post.slug}`,
      lastModified: new Date(post.created_at),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return out;
}
