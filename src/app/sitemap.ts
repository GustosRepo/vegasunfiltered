import type { MetadataRoute } from "next";
import { getPublishedStoriesForSection, sections, stories } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { getPublishedCmsArticles } from "@/lib/cms-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "",
    "/about",
    "/editorial-policy",
    "/privacy",
    "/affiliate-disclosure",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: (path === "" ? "weekly" : "yearly") as "weekly" | "yearly",
    priority: path === "" ? 1 : 0.4,
  }));
  const publishedStories = stories
    .filter((story) => story.status === "published")
    .map((story) => ({
      url: `${SITE_URL}/${story.section}/${story.slug}`,
      ...(story.updatedAt && { lastModified: new Date(story.updatedAt) }),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  const publishedSections = Object.keys(sections)
    .filter((section) =>
      getPublishedStoriesForSection(section as keyof typeof sections).length > 0,
    )
    .map((section) => ({
      url: `${SITE_URL}/${section}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  const cmsArticles = await getPublishedCmsArticles();
  const cmsPublishedStories = cmsArticles.map((article) => ({
    url: `${SITE_URL}/${article.categorySlug}/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  const cmsPublishedSections = Array.from(new Set(cmsArticles.map((article) => article.categorySlug)))
    .filter((section) => !publishedSections.some((entry) => entry.url === `${SITE_URL}/${section}`))
    .map((section) => ({ url: `${SITE_URL}/${section}`, changeFrequency: "weekly" as const, priority: 0.6 }));
  return [...staticPages, ...publishedSections, ...cmsPublishedSections, ...publishedStories, ...cmsPublishedStories];
}
