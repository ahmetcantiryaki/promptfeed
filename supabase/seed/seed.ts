/**
 * Seed script — run with `pnpm run seed`.
 * Reads supabase/seed/posts.json and upserts models, platforms, posts.
 *
 * Deterministic: same invocation produces identical source_urls (the table's
 * unique key), so re-running upserts without creating duplicates.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database.ts";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, "..", "..", ".env.local") });

interface SeedData {
  models: { slug: string; name: string }[];
  platforms: { slug: string; name: string }[];
  prompts: string[];
  images: string[];
  users: string[];
}

const MEDIA_TYPES = ["image", "video"] as const;

function pick<T>(arr: readonly T[], n: number): T {
  const item = arr[n % arr.length];
  if (item === undefined) throw new Error("empty array in pick()");
  return item;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const raw = readFileSync(join(here, "posts.json"), "utf8");
  const data: SeedData = JSON.parse(raw);

  // Upsert models & platforms
  const { error: mErr } = await supabase
    .from("models")
    .upsert(data.models.map((m) => ({ slug: m.slug, name: m.name })));
  if (mErr) throw mErr;
  const { error: pErr } = await supabase
    .from("platforms")
    .upsert(data.platforms.map((p) => ({ slug: p.slug, name: p.name })));
  if (pErr) throw pErr;

  // Generate deterministic posts
  const rand = mulberry32(0xc0ffee);
  const now = Date.now();
  const rows: Database["public"]["Tables"]["posts"]["Insert"][] = [];
  const count = 50;

  for (let i = 0; i < count; i++) {
    const prompt = pick(data.prompts, i);
    const imageId = pick(data.images, i * 3 + 1);
    const user = pick(data.users, i * 2 + 3);
    const model = pick(data.models, i * 5 + 2);
    const platform = pick(data.platforms, i * 7 + 1);
    const mediaType =
      MEDIA_TYPES[Math.floor(rand() * 5) === 0 ? 1 : 0] ?? "image";
    const mediaUrl = `https://images.unsplash.com/${imageId}?w=1200&q=80&auto=format&fit=crop`;
    const thumb = `https://images.unsplash.com/${imageId}?w=800&q=70&auto=format&fit=crop`;
    const ageMinutes = Math.floor(rand() * 60 * 24 * 14); // last 14 days
    const postedAt = new Date(now - ageMinutes * 60 * 1000).toISOString();

    rows.push({
      media_url: mediaType === "video" ? mediaUrl : mediaUrl,
      media_type: mediaType,
      thumbnail_url: thumb,
      prompt,
      model_slug: model.slug,
      platform_slug: platform.slug,
      source_user: user,
      source_url: `https://example.${platform.slug}/p/seed-${i.toString().padStart(3, "0")}`,
      likes: Math.floor(rand() * 8000) + 20,
      comments: Math.floor(rand() * 600),
      shares: Math.floor(rand() * 400),
      posted_at: postedAt,
    });
  }

  const { error: postsErr } = await supabase
    .from("posts")
    .upsert(rows, { onConflict: "source_url" });
  if (postsErr) throw postsErr;

  console.log(
    `Seeded ${data.models.length} models, ${data.platforms.length} platforms, ${rows.length} posts.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
