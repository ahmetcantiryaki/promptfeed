import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { listModelsAndPlatforms } from "@/lib/posts";
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_IMAGE,
  SITE_NAME,
} from "@/lib/site";
import type { PostSort } from "@/types/domain";
import { CategoryShell } from "../../_category-shell";
import { decodeTagParam } from "@/lib/category-url";

// `notFound` is imported at the top already; re-import safe-guarded above.

interface SearchParams {
  sort?: string;
  q?: string;
  tag?: string;
}

interface PageProps {
  params: Promise<{ slug: string; platform: string }>;
  searchParams: Promise<SearchParams>;
}

export const revalidate = 60;

function parseSort(raw?: string): PostSort {
  if (raw === "top") return "top";
  if (raw === "oldest") return "oldest";
  if (raw === "viewed") return "viewed";
  return "newest";
}

async function resolveCombo(
  modelSlug: string,
  platformSlug: string,
): Promise<{ modelName: string; platformName: string } | null> {
  const { models, platforms } = await listModelsAndPlatforms();
  const model = models.find((m) => m.slug === modelSlug);
  const platform = platforms.find((p) => p.slug === platformSlug);
  if (!model || !platform) return null;
  return { modelName: model.name, platformName: platform.name };
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug, platform } = await params;
  const sp = await searchParams;
  // Bail to 404 from metadata as well — see comment in [slug]/page.tsx.
  // Reverse-order combos (/platform/model) are still allowed to produce a
  // metadata response; the page itself handles the 308 redirect.
  const { models, platforms } = await listModelsAndPlatforms();
  const isOuterModel = models.some((m) => m.slug === slug);
  const isInnerPlatform = platforms.some((p) => p.slug === platform);
  const isOuterPlatform = platforms.some((p) => p.slug === slug);
  const isInnerModel = models.some((m) => m.slug === platform);
  const isReverseCombo = !isOuterModel && isOuterPlatform && isInnerModel;
  if (!isReverseCombo && (!isOuterModel || !isInnerPlatform)) {
    notFound();
  }
  const combo = await resolveCombo(slug, platform);
  if (!combo) {
    return { title: "Redirecting…", robots: { index: false, follow: false } };
  }
  const sort = parseSort(sp.sort);
  const sortLabel =
    sort === "top"
      ? " — top liked"
      : sort === "oldest"
        ? " — oldest first"
        : sort === "viewed"
          ? " — most viewed"
          : "";
  const title = `${combo.modelName} prompts on ${combo.platformName}${sortLabel}`;
  const description = `Browse ${combo.modelName} AI image prompts shared on ${combo.platformName}. Curated archive — copy or remix any prompt on ${SITE_NAME}.`;
  const canonical =
    sort === "newest" ? `/${slug}/${platform}` : `/${slug}/${platform}?sort=${sort}`;
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

export default async function ModelPlatformPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, platform } = await params;
  const sp = await searchParams;

  // Validate: outer must be a model and inner must be a platform.
  // If the URL is reversed (platform-first/model-second), redirect to the
  // canonical /model/platform order so we don't fragment indexing or social
  // unfurl caches.
  const { models, platforms } = await listModelsAndPlatforms();
  const isOuterModel = models.some((m) => m.slug === slug);
  const isOuterPlatform = platforms.some((p) => p.slug === slug);
  const isInnerModel = models.some((m) => m.slug === platform);
  const isInnerPlatform = platforms.some((p) => p.slug === platform);

  if (!isOuterModel && isOuterPlatform && isInnerModel) {
    // URL is /platform/model — flip to canonical /model/platform.
    permanentRedirect(`/${platform}/${slug}`);
  }
  if (!isOuterModel || !isInnerPlatform) {
    notFound();
  }

  const combo = await resolveCombo(slug, platform);
  if (!combo) notFound();

  const sort = parseSort(sp.sort);
  const q = sp.q?.trim() ? sp.q.trim().slice(0, 80) : undefined;
  const tags = decodeTagParam(sp.tag ?? null).slice(0, 5);

  const heading = `${combo.modelName} prompts on ${combo.platformName}`;
  const intro = `${combo.modelName} AI image prompts shared on ${combo.platformName}, curated for copy and remix.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`/${slug}/${platform}`),
    name: heading,
    description: intro,
    url: absoluteUrl(`/${slug}/${platform}`),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className="sr-only">{heading}</h1>
      <CategoryShell
        model={slug}
        platform={platform}
        tags={tags.length > 0 ? tags : undefined}
        sort={sort}
        q={q}
      />
    </>
  );
}

// Same dynamic/ISR strategy as the single-segment category route.
