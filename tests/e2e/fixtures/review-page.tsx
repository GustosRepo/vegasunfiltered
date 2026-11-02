import { CmsPublishedArticle } from "@/components/cms-published-article";
import { blankReviewDocument, blankReviewTemplate, withReviewTemplate } from "@/lib/review-template";
import type { PublishedCmsArticle } from "@/lib/cms-content";
import { ArticleEditor } from "@/components/admin/article-editor";
import { Suspense } from "react";
import "@/app/(admin)/admin/admin.css";

const text = (value: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: value }] }] });
const template = {
  ...blankReviewTemplate(),
  quickVerdict: "A thoughtful dinner worth returning for.",
  visitedAt: "2026-11-02",
  priceRange: "$80 per person",
  bestFor: "A relaxed date night",
  tried: text("We tried the seasonal tasting menu."),
  worthKnowing: text("Reserve a table ahead of time."),
  returnVerdict: text("Yes, for another evening together."),
  gallery: [
    { mediaId: "123e4567-e89b-42d3-a456-426614174000", url: "/icon.svg", altText: "Our dinner", caption: "The first course", credit: "Vegas Unfiltered" },
    { mediaId: "123e4567-e89b-42d3-a456-426614174001", url: "/icon.svg", altText: "The dining room", caption: "A quiet table", credit: "" },
  ],
};
const base: PublishedCmsArticle = {
  id: "123e4567-e89b-42d3-a456-426614174002", title: "Test-only review", slug: "test-only-review", subtitle: "Firsthand reporting",
  categorySlug: "restaurants", categoryName: "Restaurants", reviewType: "restaurant", overallScore: 0, tags: [],
  publishedAt: "2026-11-02T18:00:00Z", updatedAt: "2026-11-02T18:00:00Z",
  content: withReviewTemplate(text("Our original experience and photos stay together."), template),
  image: "", imageAlt: "", imageCaption: "", openGraphImage: "", seoTitle: "", metaDescription: "", canonicalUrl: "",
  indexable: false, publicReceiptUrl: null, receipt: null, authorName: null, affiliateLinks: [], restaurant: null,
  neighborhood: null, sponsored: true,
};

// Copied into the disposable test app only; never part of the deployed routes.
export default function ReviewTestPage() {
  return <CmsPublishedArticle article={base} isPreview />;
}

export function EmptyReviewTestPage() {
  return <CmsPublishedArticle article={{ ...base, title: "Empty review", sponsored: false, content: withReviewTemplate(blankReviewDocument(), blankReviewTemplate()) }} isPreview />;
}

export function ReviewEditorTestPage() {
  return <div className="cms-app"><main className="cms-content">
    <Suspense fallback={<p>Loading review editor...</p>}><ArticleEditor categories={[]} media={template.gallery.map((photo) => ({
      id: photo.mediaId, url: photo.url, altText: photo.altText, caption: photo.caption, credit: photo.credit,
    }))} restaurants={[]} neighborhoods={[]} role="owner" /></Suspense>
  </main></div>;
}
