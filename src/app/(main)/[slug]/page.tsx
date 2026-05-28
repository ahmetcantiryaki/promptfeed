import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listModelsAndPlatforms } from "@/lib/posts";
import { prettyModel, prettyPlatform } from "@/lib/labels";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
  SITE_NAME,
} from "@/lib/site";
import type { PostSort } from "@/types/domain";
import { CategoryShell } from "../_category-shell";
import { decodeTagParam } from "@/lib/category-url";

interface SearchParams {
  sort?: string;
  q?: string;
  tag?: string;
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export const revalidate = 60;

function parseSort(raw?: string): PostSort {
  if (raw === "top") return "top";
  if (raw === "oldest") return "oldest";
  if (raw === "viewed") return "viewed";
  return "newest";
}

interface CategoryResolution {
  type: "model" | "platform";
  slug: string;
  name: string;
}

async function resolveCategory(
  slug: string,
): Promise<CategoryResolution | null> {
  const { models, platforms } = await listModelsAndPlatforms();
  const model = models.find((m) => m.slug === slug);
  if (model) return { type: "model", slug: model.slug, name: model.name };
  const platform = platforms.find((p) => p.slug === slug);
  if (platform)
    return { type: "platform", slug: platform.slug, name: platform.name };
  return null;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await resolveCategory(slug);
  // generateMetadata must throw notFound() too — calling it only inside the
  // page component leaves the metadata function returning successfully,
  // which Next.js latches onto as a 200 response shell. Throwing here
  // ensures the route resolves to HTTP 404 cleanly.
  if (!cat) notFound();
  const sort = parseSort(sp.sort);
  const sortLabel =
    sort === "top"
      ? " — top liked"
      : sort === "oldest"
        ? " — oldest first"
        : sort === "viewed"
          ? " — most viewed"
          : "";
  const title =
    cat.type === "model"
      ? `${cat.name} prompts${sortLabel} — example images and copy-ready text`
      : `AI image prompts shared on ${cat.name}${sortLabel}`;
  const description =
    cat.type === "model"
      ? `Browse ${cat.name} prompts behind real AI images. Curated from social media — copy and remix any prompt instantly on ${SITE_NAME}.`
      : `${cat.name} AI image prompts curated from real posts. See the prompts behind the images, then copy or remix them on ${SITE_NAME}.`;
  const canonical = sort === "newest" ? `/${slug}` : `/${slug}?sort=${sort}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      title,
      description,
      card: "summary_large_image",
      images: [DEFAULT_TWITTER_IMAGE],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const cat = await resolveCategory(slug);
  if (!cat) notFound();

  const sort = parseSort(sp.sort);
  const q = sp.q?.trim() ? sp.q.trim().slice(0, 80) : undefined;
  const tags = decodeTagParam(sp.tag ?? null).slice(0, 5);

  const heading =
    cat.type === "model" ? `${cat.name} prompts` : `Prompts shared on ${cat.name}`;
  const intro =
    cat.type === "model"
      ? `Curated AI image prompts that produced real images with ${cat.name}. Click any card to see the prompt next to the image, then copy or remix.`
      : `AI image prompts that surfaced on ${cat.name}. Curated from real posts — click a card to see the full prompt and the image side by side.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`/${slug}`),
    name: heading,
    description: intro,
    url: absoluteUrl(`/${slug}`),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    about: {
      "@type": cat.type === "model" ? "SoftwareApplication" : "WebSite",
      name: cat.name,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">{heading}</h1>
      <CategoryShell
        model={cat.type === "model" ? cat.slug : undefined}
        platform={cat.type === "platform" ? cat.slug : undefined}
        tags={tags.length > 0 ? tags : undefined}
        sort={sort}
        q={q}
      />
    </>
  );
}

// Pages are dynamic + ISR (revalidate above) so we don't pre-generate via
// generateStaticParams — that would force calling Supabase at build time
// without a request scope, which Next.js disallows.
