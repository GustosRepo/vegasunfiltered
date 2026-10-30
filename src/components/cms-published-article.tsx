import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { PublishedCmsArticle } from "@/lib/cms-content";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CmsArticleBody } from "@/components/cms-article-body";

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
      images: article.image ? [{ url: article.image, alt: article.imageAlt }] : undefined,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle || article.title,
      description: article.metaDescription || article.subtitle,
      images: article.image ? [article.image] : undefined,
    },
  };
}

export function CmsPublishedArticle({ article }: { article: PublishedCmsArticle }) {
  return <main className="article-page">
    <div className="article-heading page-shell">
      <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href={`/${article.categorySlug}`}>{article.categoryName}</Link><span>/</span><span aria-current="page">{article.title}</span></div>
      <span className="eyebrow">{article.categoryName}</span>
      <h1>{article.title}<span className="period">.</span></h1>
      {article.subtitle && <p className="article-dek">{article.subtitle}</p>}
      <p className="article-byline">Published {new Date(article.publishedAt).toLocaleDateString("en-US", { dateStyle: "long" })}{article.updatedAt !== article.publishedAt && <> · Updated {new Date(article.updatedAt).toLocaleDateString("en-US", { dateStyle: "long" })}</>}</p>
    </div>
    {article.image && <div className="page-shell cms-public-hero"><figure className="article-figure"><Image alt={article.imageAlt} height={900} src={article.image} unoptimized width={1600} priority />{article.imageCaption && <figcaption className="image-caption">{article.imageCaption}</figcaption>}</figure></div>}
    <article className="page-shell cms-public-content"><CmsArticleBody content={article.content} /><p className="article-footnote"><Link href="/editorial-policy">How we report and correct our work</Link></p></article>
    {article.publicReceiptUrl && <section className="page-shell cms-public-receipt"><h2>Redacted receipt</h2><p>The public copy is shared separately from the private original.</p><Image alt="Redacted restaurant receipt" height={1200} src={article.publicReceiptUrl} unoptimized width={900} /></section>}
  </main>;
}
