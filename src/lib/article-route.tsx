import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticlePage } from "@/components/article-page";
import { cmsArticleMetadata, CmsPublishedArticle } from "@/components/cms-published-article";
import { getPublishedCmsArticle } from "@/lib/cms-content";
import { getStory, migrateSection, stories, type Section, type LegacySection } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function articleStaticParams(section: Section | LegacySection) {
  return stories.filter((story) => story.section === migrateSection(section)).map(({ slug }) => ({ slug }));
}

export async function articleMetadata(section: Section | LegacySection, slug: string): Promise<Metadata> {
  const cmsArticle = await getPublishedCmsArticle(migrateSection(section), slug);
  if (cmsArticle) return cmsArticleMetadata(cmsArticle);
  const story = getStory(migrateSection(section), slug);
  if (!story) return {};
  const url = `${SITE_URL}/${story.section}/${story.slug}`;
  return {
    title: { absolute: story.seoTitle ?? `${story.title} | ${SITE_NAME}` },
    description: story.metaDescription ?? story.dek,
    alternates: { canonical: url },
    robots: { index: story.status === "published", follow: true },
    openGraph: {
      type: "article",
      title: story.seoTitle ?? story.title,
      description: story.metaDescription ?? story.dek,
      url,
      images: [{ url: story.image, alt: story.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: story.seoTitle ?? story.title,
      description: story.metaDescription ?? story.dek,
      images: [story.image],
    },
  };
}

export async function renderArticleRoute(section: Section | LegacySection, slug: string) {
  // Resolve by slug first: a migrated review may no longer match its old category.
  const cmsArticle = await getPublishedCmsArticle(section, slug);
  if (cmsArticle) {
    if (section !== cmsArticle.categorySlug) permanentRedirect(`/${cmsArticle.categorySlug}/${cmsArticle.slug}`);
    return <CmsPublishedArticle article={cmsArticle} />;
  }
  const story = getStory(migrateSection(section), slug);
  if (!story) notFound();
  if (section !== story.section) permanentRedirect(`/${story.section}/${story.slug}`);
  return <ArticlePage story={story} />;
}
