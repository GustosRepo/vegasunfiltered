import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { PublishedCmsArticle } from "@/lib/cms-content";
import { SITE_NAME, SITE_SHARE_IMAGE, SITE_URL } from "@/lib/site";
import { CmsReviewContent, ReviewSummary } from "@/components/cms-review-content";
import { readReviewTemplate } from "@/lib/review-template";
import { isEditorDocument } from "@/lib/cms-schemas";
import { TheReceipt } from "@/components/the-receipt";
import { BreadcrumbJsonLd, CmsArticleJsonLd, CmsRestaurantJsonLd } from "@/components/json-ld";
import { AffiliateDisclosure, SponsoredContentLabel } from "@/components/monetization";
import { ReviewScore } from "@/components/review-score";

export function cmsArticleMetadata(article: PublishedCmsArticle): Metadata {
  const canonical = article.canonicalUrl || `${SITE_URL}/${article.categorySlug}/${article.slug}`;
  return {
    title: { absolute: article.seoTitle || `${article.title} | ${SITE_NAME}` },
    description: article.metaDescription || article.subtitle || undefined,
    alternates: { canonical },
    robots: { index: article.indexable, follow: true },
    openGraph: {
      type: "article",
      title: article.seoTitle || article.title,
      description: article.metaDescription || article.subtitle,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_US",
      images: article.openGraphImage || article.image ? [{ url: article.openGraphImage || article.image, alt: article.imageAlt }] : [SITE_SHARE_IMAGE],
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.title,
      description: article.metaDescription || article.subtitle,
      images: article.openGraphImage || article.image ? [article.openGraphImage || article.image] : [SITE_SHARE_IMAGE],
    },
  };
}

export function CmsPublishedArticle({ article, isPreview = false }: { article: PublishedCmsArticle; isPreview?: boolean }) {
  if (!isEditorDocument(article.content)) throw new Error("Review contains invalid rich text.");
  const template = readReviewTemplate(article.content);
  return <main className="article-page">
    {!isPreview && <><BreadcrumbJsonLd section={article.categorySlug} title={article.title} /><CmsArticleJsonLd article={article} /><CmsRestaurantJsonLd article={article} /></>}
    <div className="article-heading page-shell">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href={`/${article.categorySlug}`}>{article.categoryName}</Link><span>/</span><span aria-current="page">{article.title}</span></div>
      <span className="eyebrow">{article.categoryName}</span>
      {article.sponsored && <><SponsoredContentLabel /><p className="disclosure-note">This article is sponsored. Sponsorship does not determine our editorial conclusions. Read our <Link href="/affiliate-disclosure">disclosure policy</Link>.</p></>}
      <h1>{article.title}<span className="period">.</span></h1>
      {article.subtitle && <p className="article-dek">{article.subtitle}</p>}
      <ReviewScore score={article.overallScore} />
      {isPreview
        ? <p className="article-byline">Private editorial preview · not published</p>
        : <p className="article-byline">{article.authorName ? <>By {article.authorName} · </> : null}Published {new Date(article.publishedAt).toLocaleDateString("en-US", { dateStyle: "long" })}{article.updatedAt !== article.publishedAt && <> · Updated {new Date(article.updatedAt).toLocaleDateString("en-US", { dateStyle: "long" })}</>}</p>}
    </div>
    {article.image && <div className="page-shell cms-public-hero"><figure className="article-figure"><Image alt={article.imageAlt} height={900} src={article.image} unoptimized width={1600} priority />{article.imageCaption && <figcaption className="image-caption">{article.imageCaption}</figcaption>}</figure></div>}
    {template && <div className="page-shell review-summary"><ReviewSummary template={template} /></div>}
    {(article.restaurant || article.neighborhood) && <section className="page-shell article-details" aria-label="Reporting details">
      {article.restaurant && <div><span className="eyebrow">{article.reviewType === "activity" ? "ACTIVITY DETAILS" : "RESTAURANT DETAILS"}</span><h2>{article.restaurant.name}</h2>{article.restaurant.cuisine && <p>{article.restaurant.cuisine}</p>}{article.restaurant.address && <p>{article.restaurant.address}, {article.restaurant.city}, {article.restaurant.state} {article.restaurant.postalCode}</p>}{article.restaurant.website && <p><a href={article.restaurant.website} rel="noreferrer noopener" target="_blank">Visit the place website</a></p>}</div>}
      {article.neighborhood && <div><span className="eyebrow">NEIGHBORHOOD NOTES</span><h2>{article.neighborhood.name}</h2>{article.neighborhood.description && <p>{article.neighborhood.description}</p>}</div>}
    </section>}
    <article className="page-shell cms-public-content"><CmsReviewContent content={article.content} template={template} /><p className="article-footnote"><Link href="/editorial-policy">How we report and correct our work</Link></p></article>
    {article.receipt && <div className="page-shell"><TheReceipt receipt={article.receipt} /></div>}
    {article.affiliateLinks.length > 0 && <section className="page-shell related-stories" aria-label="Affiliate links">
      <AffiliateDisclosure />
      <h2>Partner links</h2>
      <ul>{article.affiliateLinks.map((link) => <li key={link.destinationUrl}>
        <a href={link.destinationUrl} rel="sponsored nofollow noopener noreferrer" target="_blank">{link.label}</a>
        {link.disclosure && <p>{link.disclosure}</p>}
      </li>)}</ul>
    </section>}
    {article.publicReceiptUrl && <section className="page-shell cms-public-receipt"><h2>Redacted receipt</h2><p>The public copy is shared separately from the private original.</p><Image alt="Redacted restaurant receipt" height={1200} src={article.publicReceiptUrl} unoptimized width={900} /></section>}
  </main>;
}
