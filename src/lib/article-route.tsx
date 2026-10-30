import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article-page";
import { cmsArticleMetadata, CmsPublishedArticle } from "@/components/cms-published-article";
import { getPublishedCmsArticle } from "@/lib/cms-content";
import { getStory, stories, type Section } from "@/lib/content";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function articleStaticParams(section: Section) {
  return stories.filter((story) => story.section === section).map(({ slug }) => ({ slug }));
}

export async function articleMetadata(section: Section, slug: string): Promise<Metadata> {
  const cmsArticle = await getPublishedCmsArticle(section, slug);
  if (cmsArticle) return cmsArticleMetadata(cmsArticle);
  const story = getStory(section, slug);
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

export async function renderArticleRoute(section: Section, slug: string) {
  const cmsArticle = await getPublishedCmsArticle(section, slug);
  if (cmsArticle) return <CmsPublishedArticle article={cmsArticle} />;
  const story = getStory(section, slug);
  if (!story) notFound();
  return <ArticlePage story={story} />;
}
