import { CmsArticleBody } from "@/components/cms-article-body";
import { ReviewGallery } from "@/components/review-gallery";
import type { EditorNode, ReviewTemplate } from "@/lib/cms-schemas";
import { hasReviewContent } from "@/lib/review-template";

export function ReviewSummary({ template }: { template: ReviewTemplate | null }) {
  if (!template) return null;
  const hasFacts = template.visitedAt || template.priceRange.trim() || template.bestFor.trim();
  return <>
    {template.quickVerdict.trim() && <section className="review-quick-verdict" aria-label="Quick verdict"><h2>Quick verdict</h2><p>{template.quickVerdict}</p></section>}
    {hasFacts && <section className="review-at-a-glance" aria-label="At a glance"><h2>At a glance</h2><dl>
      {template.visitedAt && <div><dt>Visited</dt><dd><time dateTime={template.visitedAt}>{new Date(`${template.visitedAt}T12:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</time></dd></div>}
      {template.priceRange.trim() && <div><dt>Price / budget</dt><dd>{template.priceRange}</dd></div>}
      {template.bestFor.trim() && <div><dt>Best for</dt><dd>{template.bestFor}</dd></div>}
    </dl></section>}
  </>;
}

export function CmsReviewContent({ content, template }: { content: EditorNode; template: ReviewTemplate | null }) {
  if (!template) return <CmsArticleBody content={content} />;
  return <div className="cms-review-content">
    {hasReviewContent(content) && <section aria-label="Our experience"><h2>Our experience</h2><CmsArticleBody content={content} /></section>}
    {([
      ["tried", "What we tried"], ["worthKnowing", "Worth knowing"], ["returnVerdict", "Would we go back?"],
    ] as const).map(([field, title]) => hasReviewContent(template[field]) && <section aria-label={title} key={field}>
      <h2>{title}</h2><CmsArticleBody content={template[field]} />
    </section>)}
    <ReviewGallery photos={template.gallery} />
  </div>;
}
