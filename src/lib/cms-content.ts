import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Section, Story } from "@/lib/content";
import { getSupabaseEnvironment } from "@/lib/supabase/env";

export type PublishedCmsArticle = {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  categorySlug: Section;
  categoryName: string;
  publishedAt: string;
  updatedAt: string;
  content: unknown;
  image: string;
  imageAlt: string;
  imageCaption: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  indexable: boolean;
  publicReceiptUrl: string | null;
};

const sectionSlugs = new Set<Section>(["eat", "drink", "explore", "save", "stories"]);

function publicClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loadCachedPublishedRows(url: string, key: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("published-cms");
  const client = publicClient(url, key);
  const { data, error } = await client
    .from("articles")
    .select("id,title,subtitle,slug,content,is_indexable,published_at,updated_at,category:categories(name,slug),seo:article_seo(seo_title,meta_description,canonical_url,indexing_enabled),featured:media(storage_bucket,storage_path,alt_text,caption)")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load published CMS articles: ${error.message}`);
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: receipts, error: receiptError } = await client.rpc("published_receipt_paths", {
    p_article_ids: rows.map((row) => row.id),
  });
  if (receiptError) throw new Error(`Could not load published receipt paths: ${receiptError.message}`);
  return rows.map((row) => {
    const receipt = Array.isArray(receipts) ? receipts.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === row.id) : null;
    return { row, publicReceiptPath: receipt && "storage_path" in receipt ? receipt.storage_path : null };
  });
}

async function loadCachedPublishedRow(url: string, key: string, slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("published-cms");
  const client = publicClient(url, key);
  const { data, error } = await client
    .from("articles")
    .select("id,title,subtitle,slug,content,is_indexable,published_at,updated_at,category:categories(name,slug),seo:article_seo(seo_title,meta_description,canonical_url,indexing_enabled),featured:media(storage_bucket,storage_path,alt_text,caption)")
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load published CMS article: ${error.message}`);
  if (!data) return null;
  const { data: receipts, error: receiptError } = await client.rpc("published_receipt_paths", {
    p_article_ids: [data.id],
  });
  if (receiptError) throw new Error(`Could not load a published receipt image: ${receiptError.message}`);
  const receipt = Array.isArray(receipts) ? receipts.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === data.id) : null;
  return { row: data, publicReceiptPath: receipt && "storage_path" in receipt ? receipt.storage_path : null };
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function toArticle(row: Record<string, unknown>, origin: string): PublishedCmsArticle | null {
  const category = first(row.category as { name?: string; slug?: string } | { name?: string; slug?: string }[] | null);
  const seo = first(row.seo as {
    seo_title?: string | null;
    meta_description?: string | null;
    canonical_url?: string | null;
    indexing_enabled?: boolean | null;
  } | {
    seo_title?: string | null;
    meta_description?: string | null;
    canonical_url?: string | null;
    indexing_enabled?: boolean | null;
  }[] | null);
  const image = first(row.featured as { storage_bucket?: string; storage_path?: string; alt_text?: string; caption?: string } | { storage_bucket?: string; storage_path?: string; alt_text?: string; caption?: string }[] | null);
  if (
    typeof row.id !== "string" || typeof row.title !== "string" ||
    typeof row.slug !== "string" || typeof row.published_at !== "string"
  ) return null;
  const categorySlug = category?.slug && sectionSlugs.has(category.slug as Section)
    ? category.slug as Section
    : "stories";
  const imagePath = image?.storage_bucket && image.storage_path
    ? `${origin}/storage/v1/object/public/${encodeURIComponent(image.storage_bucket)}/${image.storage_path.split("/").map(encodeURIComponent).join("/")}`
    : "/art/downtown.svg";
  const canonicalUrl = seo?.canonical_url?.startsWith("https://") ? seo.canonical_url : "";
  return {
    id: row.id,
    title: row.title,
    subtitle: typeof row.subtitle === "string" ? row.subtitle : "",
    slug: row.slug,
    categorySlug,
    categoryName: category?.name ?? "Stories",
    publishedAt: row.published_at,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : row.published_at,
    content: row.content,
    image: imagePath,
    imageAlt: image?.alt_text ?? "",
    imageCaption: image?.caption ?? "",
    seoTitle: seo?.seo_title ?? "",
    metaDescription: seo?.meta_description ?? "",
    canonicalUrl,
    indexable: row.is_indexable === true && seo?.indexing_enabled !== false,
    publicReceiptUrl: null,
  };
}

function addPublicReceiptPath(article: PublishedCmsArticle, path: unknown, origin: string) {
  if (typeof path !== "string" || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}-public-receipt\.(jpg|jpeg|png|webp|avif)$/i.test(path)) {
    return article;
  }
  return {
    ...article,
    publicReceiptUrl: `${origin}/storage/v1/object/public/editorial-media/${path.split("/").map(encodeURIComponent).join("/")}`,
  };
}

export async function getPublishedCmsArticles(section?: Section) {
  const environment = getSupabaseEnvironment();
  if (!environment) return [];
  const rows = await loadCachedPublishedRows(environment.url, environment.key);
  return rows
    .map(({ row, publicReceiptPath }) => {
      const article = toArticle(row as Record<string, unknown>, environment.url);
      return article ? addPublicReceiptPath(article, publicReceiptPath, environment.url) : null;
    })
    .filter((article): article is PublishedCmsArticle => Boolean(article))
    .filter((article) => article.indexable && (!section || article.categorySlug === section));
}

export async function getPublishedCmsArticle(section: string, slug: string) {
  if (!sectionSlugs.has(section as Section)) return null;
  const environment = getSupabaseEnvironment();
  if (!environment) return null;
  const result = await loadCachedPublishedRow(environment.url, environment.key, slug);
  const article = result ? toArticle(result.row as Record<string, unknown>, environment.url) : null;
  if (!article || article.categorySlug !== section) return null;
  return addPublicReceiptPath(article, result?.publicReceiptPath, environment.url);
}

export function toStorySummary(article: PublishedCmsArticle): Story {
  return {
    slug: article.slug,
    section: article.categorySlug,
    title: article.title,
    seoTitle: article.seoTitle || undefined,
    dek: article.subtitle || "A reported story from Las Vegas.",
    metaDescription: article.metaDescription || undefined,
    image: article.image,
    imageAlt: article.imageAlt || `${article.title} — editorial image`,
    imageCaption: article.imageCaption || undefined,
    label: article.categoryName,
    status: "published",
    tags: [],
    publishedAt: article.publishedAt.slice(0, 10),
    updatedAt: article.updatedAt.slice(0, 10),
    body: [],
  };
}
