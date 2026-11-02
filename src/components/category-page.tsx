import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { migrateSection, type Section, type LegacySection } from "@/lib/content";
import {
  getPublishedStoriesForSection,
  getStoriesForSection,
  sections,
} from "@/lib/content";
import { EditorialArt } from "@/components/editorial-art";
import { getPublishedCmsArticles, toStorySummary } from "@/lib/cms-content";
import { ReviewGrid } from "@/components/review-grid";

export async function CategoryPage({ section }: { section: Section | LegacySection }) {
  const target = migrateSection(section);
  if (target !== section) permanentRedirect(`/${target}`);
  const details = sections[target];
  const cmsArticles = await getPublishedCmsArticles(target);
  const publishedStories = [
    ...getPublishedStoriesForSection(target),
    ...cmsArticles.map(toStorySummary),
  ];
  const sectionStories = publishedStories.length
    ? publishedStories
    : getStoriesForSection(target);

  return (
    <main>
      <div className="category-intro page-shell">
        <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span>{details.title}</div>
        <span className="eyebrow">VEGAS, WITHOUT THE SCRIPT</span>
        <h1>{details.title}<span className="period">.</span></h1>
        <p>{details.intro}</p>
        {!publishedStories.length && (
          <span className="draft-notice">DEMO SECTION · EDITORIAL CONTENT IS NOT YET PUBLISHED</span>
        )}
      </div>
      <section className="category-feature page-shell" aria-label={`${details.title} stories`}>
        <EditorialArt
          alt={`Original development illustration for ${details.title.toLowerCase()}`}
          className="category-hero-art"
          src={details.image}
        />
        <ReviewGrid reviews={sectionStories} />
      </section>
    </main>
  );
}
