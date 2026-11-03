import { cmsArticleMetadata, CmsPublishedArticle } from "@/components/cms-published-article";
import { blankReviewDocument, blankReviewTemplate, withReviewTemplate } from "@/lib/review-template";
import type { PublishedCmsArticle } from "@/lib/cms-content";
import { ArticleEditor } from "@/components/admin/article-editor";
import { Suspense } from "react";
import "@/app/(admin)/admin/admin.css";
import { IdleSession } from "@/components/admin/idle-session";
import Link from "next/link";
import { HomeContent } from "@/components/home-content";
import { toStorySummary } from "@/lib/cms-content";

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
  image: "/art/diner.svg", imageAlt: "Review cover", imageCaption: "Our visit", openGraphImage: "", seoTitle: "", metaDescription: "", canonicalUrl: "",
  indexable: false, publicReceiptUrl: null, receipt: null, authorName: null, affiliateLinks: [],
  restaurant: { name: "Test restaurant — North branch", address: "123 Example Road", city: "North Las Vegas", state: "NV", postalCode: "89030", cuisine: "Seasonal cooking", website: "https://example.com/menu" },
  neighborhood: { name: "North Las Vegas", slug: "north-las-vegas", description: "" }, sponsored: true,
};

// Copied into the disposable test app only; never part of the deployed routes.
export default function ReviewTestPage() {
  return <CmsPublishedArticle article={base} isPreview />;
}

const canonicalTestArticle = { ...base, canonicalUrl: "https://example.com/old-override", authorName: "Test author", sponsored: false };

export function reviewCanonicalTestMetadata() {
  return cmsArticleMetadata(canonicalTestArticle);
}

export function ReviewCanonicalTestPage() {
  return <CmsPublishedArticle article={canonicalTestArticle} />;
}

export function EmptyReviewTestPage() {
  return <CmsPublishedArticle article={{ ...base, title: "Empty review", sponsored: false, restaurant: null, neighborhood: null, image: "", content: withReviewTemplate(blankReviewDocument(), blankReviewTemplate()) }} isPreview />;
}

export function ActivityReviewTestPage() {
  const activityTemplate = {
    ...template,
    quickVerdict: "Worth the trip? Yes, for a relaxed evening.\n\nThe longer explanation stays available without pushing the photo down the page.",
    tried: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "What We Ordered", marks: [{ type: "bold" }] }] },
      ...text("The experience itself stays intact.").content,
    ] },
    worthKnowing: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "One Thing You Should Know Before Going" }] },
      ...text("Book ahead.").content,
    ] },
    gallery: [template.gallery[0], { ...template.gallery[1], url: "/art/diner.svg" }],
  };
  return <CmsPublishedArticle article={{ ...base, title: "An evening in Las Vegas: worth the trip?", sponsored: false, reviewType: "activity", categorySlug: "activities", categoryName: "Activities", image: "/icon.svg", content: withReviewTemplate(text("Our firsthand activity review."), activityTemplate) }} relatedReviews={[
    { id: "another-review", title: "Another evening out", slug: "another-evening", categorySlug: "activities" },
  ]} />;
}

export function LegacyReviewTestPage() {
  return <CmsPublishedArticle article={{ ...base, title: "Legacy review!", sponsored: false, overallScore: null, content: text("The original review is preserved without a structured template.") }} isPreview />;
}

const advertisingReview: PublishedCmsArticle = {
  ...base, sponsored: false, indexable: true, slug: "advertising-review",
  content: withReviewTemplate({ type: "doc", content: [
    ...text("We arrived together before the evening rush and ordered several dishes to share. The service was friendly, the room felt relaxed, and we had enough time to enjoy the meal. ".repeat(3)).content,
    ...text("The food arrived hot and the portions were generous. We paid for our own visit and took notes on the experience, the price, and what we would recommend ordering again. ".repeat(3)).content,
  ] }, template),
};

export function AdvertisingReviewTestPage() {
  return <><CmsPublishedArticle article={advertisingReview} /><Link href="/e2e-review-fixture/ads-next">Next test review</Link></>;
}

export function AdvertisingHomepageTestPage() {
  return <><HomeContent reviews={[toStorySummary(advertisingReview)]} /><Link href="/e2e-review-fixture/ads">Open test review</Link></>;
}

export function AdvertisingNextReviewTestPage() {
  return <><CmsPublishedArticle article={{ ...advertisingReview, id: "123e4567-e89b-42d3-a456-426614174099", slug: "next-advertising-review", reviewType: "activity", categorySlug: "activities", categoryName: "Activities" }} /><Link href="/e2e-review-fixture/ads">Previous test review</Link></>;
}

export function AdvertisingPreviewTestPage() {
  return <CmsPublishedArticle article={advertisingReview} isPreview />;
}

export function AdvertisingNoIndexTestPage() {
  return <CmsPublishedArticle article={{ ...advertisingReview, indexable: false }} />;
}

export function AdvertisingShortTestPage() {
  return <CmsPublishedArticle article={{ ...base, indexable: true }} />;
}

export function AdvertisingEmptyTestPage() {
  return <CmsPublishedArticle article={{ ...advertisingReview, content: withReviewTemplate(blankReviewDocument(), template) }} />;
}

export function ReviewEditorTestPage() {
  return <div className="cms-app"><main className="cms-content">
    <Suspense fallback={<p>Loading review editor...</p>}><ArticleEditor categories={[]} media={template.gallery.map((photo) => ({
      id: photo.mediaId, url: photo.url, altText: photo.altText, caption: photo.caption, credit: photo.credit,
    }))} restaurants={[]} neighborhoods={[]} role="owner" recoveryUserId="fixture-owner" /></Suspense>
  </main></div>;
}

function SavedReviewEditor({ status }: { status: string }) {
  return <div className="cms-app"><main className="cms-content"><Suspense fallback={<p>Loading review editor...</p>}><ArticleEditor
    categories={[]} media={[]} restaurants={[]} neighborhoods={[]} role="owner" initialTab="publishing"
    article={{
      id: base.id, title: base.title, slug: base.slug, subtitle: base.subtitle, kind: "restaurant_review",
      category_id: null, featured_media_id: null, content: withReviewTemplate(text("Our firsthand reporting."), template), status, updated_at: base.updatedAt,
      restaurant_id: null, neighborhood_id: null, is_sponsored: false, review_type: "restaurant", overall_score: 8.5, tags: "",
      seo: { canonical_url: "https://example.com/legacy-original" },
      scheduled_at: status === "scheduled" ? "2099-12-31T23:00:00Z" : null,
    }}
  /></Suspense></main></div>;
}

export function PublishedReviewEditorTestPage() { return <SavedReviewEditor status="published" />; }
export function ScheduledReviewEditorTestPage() { return <SavedReviewEditor status="scheduled" />; }
export function ArchivedReviewEditorTestPage() { return <SavedReviewEditor status="archived" />; }
export function ApprovedReviewEditorTestPage() { return <SavedReviewEditor status="approved" />; }

export function IdleSessionTestPage() {
  return <div className="cms-app"><h1>Session timer test</h1><IdleSession initialDeadline={4102444800000} /></div>;
}
