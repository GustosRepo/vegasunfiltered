import { getPublishedStoriesForSection, type Section } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";
import { getPublishedCmsArticles } from "@/lib/cms-content";

export async function sectionMetadata(
  section: Section,
  title: string,
  description: string,
  {
    index = getPublishedStoriesForSection(section).length > 0,
  }: { index?: boolean } = {},
) {
  const cmsStories = await getPublishedCmsArticles(section);
  return pageMetadata({
    title: `${title} | Vegas Unfiltered`,
    description,
    path: `/${section}`,
    index: index ?? (getPublishedStoriesForSection(section).length > 0 || cmsStories.length > 0),
  });
}
