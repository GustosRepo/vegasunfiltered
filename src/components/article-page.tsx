import Link from "next/link";
import type { Story } from "@/lib/content";
import { EditorialArt } from "@/components/editorial-art";
import { stories } from "@/lib/content";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
  RestaurantJsonLd,
  VideoObjectJsonLd,
} from "@/components/json-ld";
import {
  AffiliateDisclosure,
  SponsoredContentLabel,
} from "@/components/monetization";

function headingId(heading: string, index: number) {
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `section-${index + 1}-${slug}`;
}

export function ArticlePage({ story }: { story: Story }) {
  const receiptAmounts = story.receipt
    ? [
        ["Food", story.receipt.foodTotal],
        ["Drinks", story.receipt.drinks],
        ["Tax", story.receipt.tax],
        ["Tip", story.receipt.tip],
      ] as const
    : [];

  return (
    <main className="article-page">
      <ArticleJsonLd story={story} />
      <BreadcrumbJsonLd section={story.section} title={story.title} />
      <RestaurantJsonLd story={story} />
      <VideoObjectJsonLd story={story} />
      <div className="article-heading page-shell">
        <div className="breadcrumbs">
          <Link href="/">Home</Link><span>/</span>
          <Link href={`/${story.section}`}>{story.section}</Link><span>/</span>
          <span aria-current="page">{story.title}</span>
        </div>
        <span className="eyebrow">{story.label}</span>
        {story.sponsored && <SponsoredContentLabel />}
        <h1>{story.title}<span className="period">.</span></h1>
        <p className="article-dek">{story.dek}</p>
        {story.status === "draft" ? (
          <div className="draft-notice article-draft">
            DEVELOPMENT DRAFT · NOT REPORTED · DO NOT PUBLISH OR INDEX
          </div>
        ) : (
          <p className="article-byline">
            By {story.author} · Published{" "}
            {new Date(`${story.publishedAt}T00:00:00`).toLocaleDateString("en-US", {
              dateStyle: "long",
              timeZone: "UTC",
            })}
            {story.updatedAt && (
              <>
                {" "}· Updated{" "}
                {new Date(`${story.updatedAt}T00:00:00`).toLocaleDateString("en-US", {
                  dateStyle: "long",
                  timeZone: "UTC",
                })}
              </>
            )}
          </p>
        )}
      </div>
      <div className="page-shell article-content-layout">
        <figure className="article-figure">
          <EditorialArt
            alt={story.imageAlt}
            className="article-hero-art"
            priority
            src={story.image}
          />
          {story.imageCaption && (
            <figcaption className="image-caption">{story.imageCaption}</figcaption>
          )}
        </figure>
        <article className="article-body">
          {story.status === "draft" && (
            <p className="article-lede">
              This page is an editorial placeholder. It contains no firsthand reporting,
              verified recommendations, or claims about a real visit.
            </p>
          )}
          {story.containsAffiliateLinks && (
            <AffiliateDisclosure />
          )}
          {story.body.length >= 3 && (
            <nav className="article-toc" aria-label="Table of contents">
              <span className="eyebrow">IN THIS STORY</span>
              <ol>
                {story.body.map((block, index) => (
                  <li key={block.heading}>
                    <a href={`#${headingId(block.heading, index)}`}>{block.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          {story.body.map((block, index) => (
            <section id={headingId(block.heading, index)} key={block.heading}>
              <h2>{block.heading}</h2>
              {block.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          {story.videos?.map((video) => (
            <figure className="article-video" key={video.embedUrl}>
              <iframe
                allow="encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                src={video.embedUrl}
                title={video.title}
              />
              <figcaption>
                <strong>{video.title}</strong>
                {video.caption && <span> — {video.caption}</span>}
              </figcaption>
            </figure>
          ))}
          {story.restaurant && (
            <section className="article-details" aria-label="Restaurant details">
              <span className="eyebrow">PLACE NOTES</span>
              <h2>{story.restaurant.name}</h2>
              {story.restaurant.cuisine && <p>{story.restaurant.cuisine}</p>}
              {story.restaurant.neighborhood && <p>{story.restaurant.neighborhood}</p>}
              {story.restaurant.address && (
                <p>
                  {[
                    story.restaurant.address.streetAddress,
                    `${story.restaurant.address.addressLocality}, ${story.restaurant.address.addressRegion} ${story.restaurant.address.postalCode ?? ""}`.trim(),
                    story.restaurant.address.addressCountry,
                  ].join(", ")}
                </p>
              )}
              {story.restaurant.url && (
                <p>
                  <a href={story.restaurant.url} rel="noreferrer" target="_blank">
                    Visit the restaurant&apos;s website
                  </a>
                </p>
              )}
            </section>
          )}
          {story.neighborhood && (
            <section className="article-details" aria-label="Neighborhood information">
              <span className="eyebrow">NEIGHBORHOOD NOTES</span>
              <h2>{story.neighborhood.name}</h2>
              <p>{story.neighborhood.summary}</p>
            </section>
          )}
          {story.receipt && (
            <section className="receipt-box" aria-label="The receipt">
              <span className="eyebrow">THE RECEIPT</span>
              {story.receipt.restaurantName && (
                <h2 id="receipt-heading">{story.receipt.restaurantName}</h2>
              )}
              {story.receipt.neighborhood && <p>{story.receipt.neighborhood}</p>}
              {story.receipt.cuisine && <p>{story.receipt.cuisine}</p>}
              {receiptAmounts.map(([label, amount]) =>
                amount === undefined ? null : (
                  <p key={label}>
                    {label}: {amount.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </p>
                ),
              )}
              {story.receipt.finalTotal !== undefined && (
                <p className="receipt-total">
                  Verified total: {story.receipt.finalTotal.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              )}
              {story.receipt.partySize !== undefined && (
                <p>Party size: {story.receipt.partySize}</p>
              )}
              {story.receipt.visitedOn && <p>Visited: {story.receipt.visitedOn}</p>}
              {story.receipt.parking && <p>Parking: {story.receipt.parking}</p>}
              {story.receipt.wouldReturn && (
                <p>Would we return? {story.receipt.wouldReturn}</p>
              )}
              {story.receipt.verdict && <p>{story.receipt.verdict}</p>}
            </section>
          )}
          {story.relatedStories?.length ? (
            <aside className="related-stories" aria-labelledby="related-heading">
              <span className="eyebrow">KEEP EXPLORING</span>
              <h2 id="related-heading">Related stories</h2>
              <ul>
                {story.relatedStories.map((slug) => {
                  const related = stories.find((item) => item.slug === slug);
                  return related ? (
                    <li key={slug}>
                      <Link href={`/${related.section}/${related.slug}`}>{related.title}</Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </aside>
          ) : null}
          <p className="article-footnote">
            <Link href="/editorial-policy">How we report and correct our work</Link>
          </p>
        </article>
      </div>
    </main>
  );
}
