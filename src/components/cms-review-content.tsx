import { CmsArticleBody } from "@/components/cms-article-body";
import { ReviewGallery } from "@/components/review-gallery";
import type { PublishedCmsArticle } from "@/lib/cms-content";
import type { EditorNode, ReviewTemplate } from "@/lib/cms-schemas";
import { blankReviewTemplate, hasReviewContent, quickVerdictPreview, reviewSections, withoutRepeatedSectionLabel } from "@/lib/review-template";

export function ReviewQuickVerdict({ text }: { text: string }) {
  const { summary, remainder } = quickVerdictPreview(text);
  if (!summary) return null;
  return <section className="review-quick-verdict" aria-label="Quick verdict">
    <h2>Quick verdict</h2><p>{summary}</p>
    {remainder && <details className="review-verdict-more"><summary>Read the full takeaway</summary><p>{remainder}</p></details>}
  </section>;
}

export function ReviewDetails({ article, template }: { article: PublishedCmsArticle; template: ReviewTemplate | null }) {
  const place = article.restaurant;
  const address = place ? [place.address, place.city, [place.state, place.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
  const hasFacts = place || article.neighborhood || template?.visitedAt || template?.priceRange.trim() || template?.bestFor.trim();
  if (!hasFacts) return null;
  return <section className="review-at-a-glance" aria-label="At a glance">
    <h2>At a glance</h2>
    <dl>
      {place && <div className="review-place"><dt>{article.reviewType === "activity" ? "Activity / location" : "Restaurant / location"}</dt><dd><strong>{place.name}</strong>{address && <address>{address}</address>}{place.cuisine && <span>{place.cuisine}</span>}</dd></div>}
      {template?.priceRange.trim() && <div><dt>Price / budget</dt><dd>{template.priceRange}</dd></div>}
      {template?.bestFor.trim() && <div><dt>Best for</dt><dd>{template.bestFor}</dd></div>}
      {article.neighborhood && <div><dt>Neighborhood</dt><dd>{article.neighborhood.name}{article.neighborhood.description && <p>{article.neighborhood.description}</p>}</dd></div>}
      {template?.visitedAt && <div><dt>Visited</dt><dd><time dateTime={template.visitedAt}>{new Date(`${template.visitedAt}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</time></dd></div>}
    </dl>
    {(place?.address || place?.website) && <div className="review-place-actions">
      {place.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.name}, ${address}`)}`} rel="noreferrer noopener" target="_blank">Directions <span aria-hidden="true">↗</span></a>}
      {place.website && <a href={place.website} rel="noreferrer noopener" target="_blank">{article.reviewType === "activity" ? "Official website" : "Menu / website"} <span aria-hidden="true">↗</span></a>}
    </div>}
  </section>;
}

function narrativeSections(content: EditorNode, template: ReviewTemplate | null) {
  const review = template ?? blankReviewTemplate();
  return [
    { id: "our-experience", title: "Our experience", content: withoutRepeatedSectionLabel(content, ["Our experience"]) },
    ...reviewSections.map(({ field, id, title, aliases }) => ({
      id, title, content: withoutRepeatedSectionLabel(review[field], [title, ...aliases]),
    })),
  ].filter((section) => hasReviewContent(section.content));
}

export function ReviewJumpLinks({ content, template }: { content: EditorNode; template: ReviewTemplate | null }) {
  const sections = narrativeSections(content, template);
  if (sections.length < 2) return null;
  return <nav className="review-jump-links" aria-label="In this review">
    <span>In this review</span>
    {sections.map(({ id, title }) => <a href={`#${id}`} key={id}>{title}</a>)}
  </nav>;
}

export function CmsReviewContent({ content, template, coverImage = "" }: { content: EditorNode; template: ReviewTemplate | null; coverImage?: string }) {
  // Hide the cover's duplicate gallery entry without changing stored selections.
  const photos = template?.gallery.filter((photo) => photo.url !== coverImage) ?? [];
  return <div className="cms-review-content">
    {narrativeSections(content, template).map(({ id, title, content: body }) => <section id={id} aria-labelledby={`${id}-heading`} key={id}>
      <h2 id={`${id}-heading`}>{title}</h2><CmsArticleBody content={body} />
    </section>)}
    <ReviewGallery photos={photos} />
  </div>;
}
