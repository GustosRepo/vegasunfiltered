import Link from "next/link";
import type { Section } from "@/lib/content";
import {
  getPublishedStoriesForSection,
  getStoriesForSection,
  sections,
} from "@/lib/content";
import { EditorialArt } from "@/components/editorial-art";
import { StoryCard } from "@/components/story-card";
import { getPublishedCmsArticles, toStorySummary } from "@/lib/cms-content";

export async function CategoryPage({ section }: { section: Section }) {
  const details = sections[section];
  const cmsArticles = await getPublishedCmsArticles(section);
  const publishedStories = [
    ...getPublishedStoriesForSection(section),
    ...cmsArticles.map(toStorySummary),
  ];
  const sectionStories = publishedStories.length
    ? publishedStories
    : getStoriesForSection(section);

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
        <div className="category-story-grid">
          {sectionStories.map((story) => <StoryCard key={story.slug} story={story} />)}
        </div>
      </section>
    </main>
  );
}
