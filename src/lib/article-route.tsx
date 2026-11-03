import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cmsArticleMetadata, CmsPublishedArticle } from "@/components/cms-published-article";
import { getPublishedCmsArticle, getPublishedCmsArticles } from "@/lib/cms-content";
import { type Section, type LegacySection } from "@/lib/content";

export async function articleMetadata(section: Section | LegacySection, slug: string): Promise<Metadata> {
  const cmsArticle = await getPublishedCmsArticle(section, slug);
  if (cmsArticle) return cmsArticleMetadata(cmsArticle);
  return {};
}

export async function renderArticleRoute(section: Section | LegacySection, slug: string) {
  // Resolve by slug first: a migrated review may no longer match its old category.
  const cmsArticle = await getPublishedCmsArticle(section, slug);
  if (cmsArticle) {
    if (section !== cmsArticle.categorySlug) permanentRedirect(`/${cmsArticle.categorySlug}/${cmsArticle.slug}`);
    const relatedReviews = (await getPublishedCmsArticles(cmsArticle.categorySlug))
      .filter((review) => review.id !== cmsArticle.id).slice(0, 3);
    return <CmsPublishedArticle article={cmsArticle} relatedReviews={relatedReviews} />;
  }
  notFound();
}
