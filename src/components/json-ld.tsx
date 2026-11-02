import type { Story } from "@/lib/content";
import type { PublishedCmsArticle } from "@/lib/cms-content";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHARE_IMAGE, SITE_URL } from "@/lib/site";

function serialize(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function OrganizationJsonLd() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: SITE_NAME,
          url: SITE_URL,
          description: SITE_DESCRIPTION,
        }),
      }}
      type="application/ld+json"
    />
  );
}

export function AboutJsonLd() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/about#webpage`,
    url: `${SITE_URL}/about`,
    name: "About Vegas Unfiltered",
    description: "A dad and husband's firsthand Las Vegas restaurant and activity reviews, with real costs and honest opinions.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "About me", item: `${SITE_URL}/about` },
      ],
    },
  }) }} />;
}

export function WebsiteJsonLd() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          name: SITE_NAME,
          url: SITE_URL,
          publisher: { "@id": `${SITE_URL}/#organization` },
          inLanguage: "en-US",
        }),
      }}
      type="application/ld+json"
    />
  );
}

export function BreadcrumbJsonLd({
  section,
  title,
}: {
  section: string;
  title: string;
}) {
  const sectionName = section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: SITE_URL,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: sectionName,
              item: `${SITE_URL}/${section}`,
            },
            { "@type": "ListItem", position: 3, name: title },
          ],
        }),
      }}
      type="application/ld+json"
    />
  );
}

export function ArticleJsonLd({ story }: { story: Story }) {
  if (story.status !== "published" || !story.author || !story.publishedAt) {
    return null;
  }
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${SITE_URL}/${story.section}/${story.slug}#article`,
          headline: story.title,
          description: story.dek,
          image: `${SITE_URL}${story.image}`,
          mainEntityOfPage: `${SITE_URL}/${story.section}/${story.slug}`,
          datePublished: story.publishedAt,
          ...(story.updatedAt && {
            dateModified: story.updatedAt,
          }),
          author: {
            "@type": "Person",
            name: story.author,
          },
          publisher: { "@id": `${SITE_URL}/#organization` },
          articleSection: story.section,
          inLanguage: "en-US",
        }),
      }}
      type="application/ld+json"
    />
  );
}

export function RestaurantJsonLd({ story }: { story: Story }) {
  const restaurant = story.restaurant;
  if (story.status !== "published" || !restaurant?.name || !restaurant.address) {
    return null;
  }
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "@id": `${SITE_URL}/${story.section}/${story.slug}#restaurant`,
          name: restaurant.name,
          address: {
            "@type": "PostalAddress",
            ...restaurant.address,
          },
          ...(restaurant.cuisine && { servesCuisine: restaurant.cuisine }),
          ...(restaurant.url && { url: restaurant.url }),
        }),
      }}
      type="application/ld+json"
    />
  );
}

export function VideoObjectJsonLd({ story }: { story: Story }) {
  if (story.status !== "published") return null;
  const videos = story.videos?.filter((video) => video.originalVideo) ?? [];
  return videos.map((video, index) => {
    const original = video.originalVideo;
    if (!original || !video.caption) return null;
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: serialize({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            "@id": `${SITE_URL}/${story.section}/${story.slug}#video-${index + 1}`,
            name: video.title,
            description: video.caption,
            thumbnailUrl: original.thumbnailUrl,
            uploadDate: original.uploadDate,
            embedUrl: video.embedUrl,
            ...(original.duration && { duration: original.duration }),
            ...(original.contentUrl && { contentUrl: original.contentUrl }),
            publisher: { "@id": `${SITE_URL}/#organization` },
          }),
        }}
        key={video.embedUrl}
        type="application/ld+json"
      />
    );
  });
}

export function CmsArticleJsonLd({ article }: { article: PublishedCmsArticle }) {
  if (!article.authorName) return null;
  const url = `${SITE_URL}/${article.categorySlug}/${article.slug}`;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${url}#article`,
          headline: article.title,
          description: article.metaDescription || article.subtitle,
          image: new URL(article.openGraphImage || article.image || SITE_SHARE_IMAGE.url, SITE_URL).href,
          mainEntityOfPage: article.canonicalUrl || url,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          author: { "@type": "Person", name: article.authorName },
          publisher: { "@id": `${SITE_URL}/#organization` },
          articleSection: article.categoryName,
          inLanguage: "en-US",
        }),
      }}
      type="application/ld+json"
    />
  );
}

export function CmsRestaurantJsonLd({ article }: { article: PublishedCmsArticle }) {
  const restaurant = article.restaurant;
  if (article.reviewType !== "restaurant" || !restaurant?.name || !restaurant.address || !restaurant.city || !restaurant.state) return null;
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: serialize({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          "@id": `${SITE_URL}/${article.categorySlug}/${article.slug}#restaurant`,
          name: restaurant.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: restaurant.address,
            addressLocality: restaurant.city,
            addressRegion: restaurant.state,
            ...(restaurant.postalCode && { postalCode: restaurant.postalCode }),
          },
          ...(restaurant.cuisine && { servesCuisine: restaurant.cuisine }),
          ...(restaurant.website && { url: restaurant.website }),
        }),
      }}
      type="application/ld+json"
    />
  );
}
