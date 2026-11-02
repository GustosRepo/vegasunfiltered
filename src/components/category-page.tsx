import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { migrateSection, type Section, type LegacySection } from "@/lib/content";
import { sections } from "@/lib/content";
import { getPublishedCmsArticles, toStorySummary } from "@/lib/cms-content";
import { ReviewGrid } from "@/components/review-grid";

export async function CategoryPage({ section }: { section: Section | LegacySection }) {
  const target = migrateSection(section);
  if (target !== section) permanentRedirect(`/${target}`);
  const details = sections[target];
  const cmsArticles = await getPublishedCmsArticles(target);
  const reviews = cmsArticles.map(toStorySummary);

  return (
    <main>
      <div className="category-intro page-shell">
        <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span>{details.title}</div>
        <span className="eyebrow">VEGAS, WITHOUT THE SCRIPT</span>
        <h1>{details.title}<span className="period">.</span></h1>
        <p>{details.intro}</p>
      </div>
      <section className="category-feature page-shell" aria-label={`${details.title} reviews`}>
        <ReviewGrid reviews={reviews} />
      </section>
    </main>
  );
}
