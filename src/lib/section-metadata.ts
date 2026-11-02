import { getPublishedStoriesForSection, migrateSection, type Section, type LegacySection } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";
import { getPublishedCmsArticles } from "@/lib/cms-content";

export async function sectionMetadata(
  section: Section | LegacySection,
  title: string,
  description: string,
  {
    index,
  }: { index?: boolean } = {},
) {
  const target = migrateSection(section);
  const cmsStories = await getPublishedCmsArticles(target);
  return pageMetadata({
    title: `${title} | Vegas Unfiltered`,
    description,
    path: `/${target}`,
    index: index ?? (getPublishedStoriesForSection(target).length > 0 || cmsStories.length > 0),
  });
}
