import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { reviewSection, type Section, type Story } from "@/lib/content";
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
  openGraphImage: string;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  indexable: boolean;
  publicReceiptUrl: string | null;
  receipt: PublicReceiptDetails | null;
  authorName: string | null;
  affiliateLinks: { label: string; destinationUrl: string; disclosure: string }[];
  restaurant: {
    name: string;
    cuisine: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    website: string | null;
  } | null;
  neighborhood: { name: string; slug: string; description: string } | null;
  sponsored: boolean;
  reviewType: "restaurant" | "activity";
  overallScore: number | null;
  tags: string[];
};

export type PublicReceiptDetails = {
  restaurantName: string;
  visitedAt: string;
  partySize: number;
  foodSubtotal: number;
  drinksSubtotal: number;
  additionalCharges: number;
  salesTax: number;
  tip: number;
  finalTotal: number;
  itemsOrdered: { name: string; amount?: number }[];
  wouldReturn: boolean | null;
  editorialVerdict: string;
  totalAdjusted: boolean;
};

const sectionSlugs = new Set<Section>(["restaurants", "activities"]);

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
    .select("id,title,subtitle,slug,content,review_type,overall_score,is_indexable,is_sponsored,published_at,updated_at,category:categories(name,slug),tags:article_tags(tag:tags(name)),seo:article_seo(seo_title,meta_description,canonical_url,open_graph_media_id,indexing_enabled),featured:media!articles_featured_media_fk(storage_bucket,storage_path,alt_text,caption)")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Could not load published CMS articles: ${error.message}`);
  const rows = data ?? [];
  if (!rows.length) return [];
  const openGraphIds = rows.flatMap((row) => {
    const seo = first(row.seo as { open_graph_media_id?: string | null } | { open_graph_media_id?: string | null }[] | null);
    return seo?.open_graph_media_id ? [seo.open_graph_media_id] : [];
  });
  const { data: openGraphMedia, error: openGraphError } = openGraphIds.length
    ? await client.from("media").select("id,storage_bucket,storage_path").in("id", openGraphIds).eq("storage_bucket", "editorial-media").eq("is_public", true)
    : { data: [], error: null };
  if (openGraphError) throw new Error(`Could not load social sharing images: ${openGraphError.message}`);
  const openGraphImages = new Map((openGraphMedia ?? []).map((image) => [
    image.id,
    `${url}/storage/v1/object/public/${encodeURIComponent(image.storage_bucket)}/${image.storage_path.split("/").map(encodeURIComponent).join("/")}`,
  ]));
  const { data: receipts, error: receiptError } = await client.rpc("published_receipt_paths", {
    p_article_ids: rows.map((row) => row.id),
  });
  if (receiptError) throw new Error(`Could not load published receipt paths: ${receiptError.message}`);
  const { data: details, error: detailsError } = await client.rpc("published_receipt_details", {
    p_article_ids: rows.map((row) => row.id),
  });
  if (detailsError) throw new Error(`Could not load public receipt details: ${detailsError.message}`);
  const { data: authors, error: authorError } = await client.rpc("published_article_authors", {
    p_article_ids: rows.map((row) => row.id),
  });
  if (authorError) throw new Error(`Could not load public article authors: ${authorError.message}`);
  const { data: affiliateLinks, error: affiliateError } = await client.rpc("published_affiliate_links", {
    p_article_ids: rows.map((row) => row.id),
  });
  if (affiliateError) throw new Error(`Could not load published affiliate links: ${affiliateError.message}`);
  const { data: contexts, error: contextError } = await client.rpc("published_article_contexts", {
    p_article_ids: rows.map((row) => row.id),
  });
  if (contextError) throw new Error(`Could not load published article context: ${contextError.message}`);
  return rows.map((row) => {
    const receipt = Array.isArray(receipts) ? receipts.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === row.id) : null;
    const detail = Array.isArray(details) ? details.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === row.id) : null;
    const author = Array.isArray(authors) ? authors.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === row.id) : null;
    const articleLinks = Array.isArray(affiliateLinks) ? affiliateLinks.filter((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === row.id) : [];
    const context = Array.isArray(contexts) ? contexts.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === row.id) : null;
    const seo = first(row.seo as { open_graph_media_id?: string | null } | { open_graph_media_id?: string | null }[] | null);
    return { row, publicReceiptPath: receipt && "storage_path" in receipt ? receipt.storage_path : null, publicReceiptDetails: detail, authorName: author && "display_name" in author ? author.display_name : null, affiliateLinks: articleLinks, context, openGraphImage: seo?.open_graph_media_id ? openGraphImages.get(seo.open_graph_media_id) ?? "" : "" };
  });
}

async function loadCachedPublishedRow(url: string, key: string, slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("published-cms");
  const client = publicClient(url, key);
  const { data, error } = await client
    .from("articles")
    .select("id,title,subtitle,slug,content,review_type,overall_score,is_indexable,is_sponsored,published_at,updated_at,category:categories(name,slug),tags:article_tags(tag:tags(name)),seo:article_seo(seo_title,meta_description,canonical_url,open_graph_media_id,indexing_enabled),featured:media!articles_featured_media_fk(storage_bucket,storage_path,alt_text,caption)")
    .eq("slug", slug)
    .eq("status", "published")
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load published CMS article: ${error.message}`);
  if (!data) return null;
  const seo = first(data.seo as { open_graph_media_id?: string | null } | { open_graph_media_id?: string | null }[] | null);
  const { data: openGraphMedia, error: openGraphError } = seo?.open_graph_media_id
    ? await client.from("media").select("storage_bucket,storage_path").eq("id", seo.open_graph_media_id).eq("storage_bucket", "editorial-media").eq("is_public", true).maybeSingle()
    : { data: null, error: null };
  if (openGraphError) throw new Error(`Could not load a social sharing image: ${openGraphError.message}`);
  const openGraphImage = openGraphMedia
    ? `${url}/storage/v1/object/public/${encodeURIComponent(openGraphMedia.storage_bucket)}/${openGraphMedia.storage_path.split("/").map(encodeURIComponent).join("/")}`
    : "";
  const { data: receipts, error: receiptError } = await client.rpc("published_receipt_paths", {
    p_article_ids: [data.id],
  });
  if (receiptError) throw new Error(`Could not load a published receipt image: ${receiptError.message}`);
  const { data: details, error: detailsError } = await client.rpc("published_receipt_details", {
    p_article_ids: [data.id],
  });
  if (detailsError) throw new Error(`Could not load public receipt details: ${detailsError.message}`);
  const { data: authors, error: authorError } = await client.rpc("published_article_authors", {
    p_article_ids: [data.id],
  });
  if (authorError) throw new Error(`Could not load a public article author: ${authorError.message}`);
  const { data: affiliateLinks, error: affiliateError } = await client.rpc("published_affiliate_links", {
    p_article_ids: [data.id],
  });
  if (affiliateError) throw new Error(`Could not load published affiliate links: ${affiliateError.message}`);
  const { data: contexts, error: contextError } = await client.rpc("published_article_contexts", {
    p_article_ids: [data.id],
  });
  if (contextError) throw new Error(`Could not load published article context: ${contextError.message}`);
  const receipt = Array.isArray(receipts) ? receipts.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === data.id) : null;
  const detail = Array.isArray(details) ? details.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === data.id) : null;
  const author = Array.isArray(authors) ? authors.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === data.id) : null;
  const context = Array.isArray(contexts) ? contexts.find((entry) => typeof entry === "object" && entry !== null && "article_id" in entry && entry.article_id === data.id) : null;
  return { row: data, publicReceiptPath: receipt && "storage_path" in receipt ? receipt.storage_path : null, publicReceiptDetails: detail, authorName: author && "display_name" in author ? author.display_name : null, affiliateLinks: affiliateLinks ?? [], context, openGraphImage };
}

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function toArticle(row: Record<string, unknown>, origin: string): PublishedCmsArticle | null {
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
  const reviewType = row.review_type === "activity" ? "activity" : "restaurant";
  const categorySlug = reviewSection(reviewType);
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
    categoryName: reviewType === "activity" ? "Activities" : "Restaurants",
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
    openGraphImage: "",
    publicReceiptUrl: null,
    receipt: null,
    authorName: null,
    affiliateLinks: [],
    restaurant: null,
    neighborhood: null,
    sponsored: row.is_sponsored === true,
    reviewType,
    overallScore: row.overall_score === null || row.overall_score === undefined ? null : Number(row.overall_score),
    tags: Array.isArray(row.tags) ? row.tags.flatMap((entry: unknown) => {
      if (typeof entry !== "object" || entry === null || !("tag" in entry)) return [];
      const tags = Array.isArray(entry.tag) ? entry.tag : [entry.tag];
      return tags.flatMap((tag: unknown) => typeof tag === "object" && tag !== null && "name" in tag && typeof tag.name === "string" ? [tag.name] : []);
    }) : [],
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
    .map(({ row, publicReceiptPath, publicReceiptDetails, authorName, affiliateLinks, context, openGraphImage }) => {
      const article = toArticle(row as Record<string, unknown>, environment.url);
      return article ? {
        ...addPublicReceiptDetails(addPublicReceiptPath(article, publicReceiptPath, environment.url), publicReceiptDetails),
        authorName: typeof authorName === "string" ? authorName : null,
        affiliateLinks: normalizeAffiliateLinks(affiliateLinks),
        ...normalizeContext(context),
        openGraphImage: typeof openGraphImage === "string" ? openGraphImage : "",
      } : null;
    })
    .filter((article): article is PublishedCmsArticle => Boolean(article))
    .filter((article) => article.indexable && (!section || article.categorySlug === section));
}

export async function getPublishedCmsArticle(section: string, slug: string) {
  const isLegacySection = ["eat", "drink", "explore", "save", "stories"].includes(section);
  if (!sectionSlugs.has(section as Section) && !isLegacySection) return null;
  const environment = getSupabaseEnvironment();
  if (!environment) return null;
  const result = await loadCachedPublishedRow(environment.url, environment.key, slug);
  const article = result ? toArticle(result.row as Record<string, unknown>, environment.url) : null;
  if (!article || (!isLegacySection && article.categorySlug !== section)) return null;
  return {
    ...addPublicReceiptDetails(addPublicReceiptPath(article, result?.publicReceiptPath, environment.url), result?.publicReceiptDetails),
    authorName: typeof result?.authorName === "string" ? result.authorName : null,
    affiliateLinks: normalizeAffiliateLinks(result?.affiliateLinks),
    ...normalizeContext(result?.context),
    openGraphImage: result?.openGraphImage ?? "",
  };
}

function normalizeContext(value: unknown): Pick<PublishedCmsArticle, "restaurant" | "neighborhood"> {
  if (typeof value !== "object" || value === null) return { restaurant: null, neighborhood: null };
  const row = value as Record<string, unknown>;
  const restaurant = typeof row.restaurant_name === "string" ? {
    name: row.restaurant_name,
    cuisine: typeof row.cuisine === "string" ? row.cuisine : "",
    address: typeof row.address === "string" ? row.address : "",
    city: typeof row.city === "string" ? row.city : "",
    state: typeof row.state === "string" ? row.state : "",
    postalCode: typeof row.postal_code === "string" ? row.postal_code : "",
    website: typeof row.website === "string" && row.website.startsWith("https://") ? row.website : null,
  } : null;
  const neighborhood = typeof row.neighborhood_name === "string" && typeof row.neighborhood_slug === "string" ? {
    name: row.neighborhood_name,
    slug: row.neighborhood_slug,
    description: typeof row.neighborhood_description === "string" ? row.neighborhood_description : "",
  } : null;
  return { restaurant, neighborhood };
}

function normalizeAffiliateLinks(value: unknown): PublishedCmsArticle["affiliateLinks"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const link = entry as Record<string, unknown>;
    if (typeof link.label !== "string" || typeof link.destination_url !== "string" || !link.destination_url.startsWith("https://")) return [];
    return [{ label: link.label, destinationUrl: link.destination_url, disclosure: typeof link.disclosure === "string" ? link.disclosure : "" }];
  });
}

function addPublicReceiptDetails(article: PublishedCmsArticle, value: unknown): PublishedCmsArticle {
  if (typeof value !== "object" || value === null) return article;
  const row = value as Record<string, unknown>;
  const numeric = ["party_size", "food_subtotal", "drinks_subtotal", "additional_charges", "sales_tax", "tip", "final_total"];
  if (typeof row.restaurant_name !== "string" || typeof row.visited_at !== "string" || numeric.some((key) => !Number.isFinite(Number(row[key])))) return article;
  const items = Array.isArray(row.items_ordered) ? row.items_ordered.flatMap((item) => {
    if (typeof item !== "object" || item === null || !("name" in item) || typeof item.name !== "string") return [];
    return [{ name: item.name, ...("amount" in item && typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount >= 0 ? { amount: item.amount } : {}) }];
  }) : [];
  return {
    ...article,
    receipt: {
      restaurantName: row.restaurant_name,
      visitedAt: row.visited_at,
      partySize: Number(row.party_size),
      foodSubtotal: Number(row.food_subtotal),
      drinksSubtotal: Number(row.drinks_subtotal),
      additionalCharges: Number(row.additional_charges),
      salesTax: Number(row.sales_tax),
      tip: Number(row.tip),
      finalTotal: Number(row.final_total),
      itemsOrdered: items,
      wouldReturn: typeof row.would_return === "boolean" ? row.would_return : null,
      editorialVerdict: typeof row.editorial_verdict === "string" ? row.editorial_verdict : "",
      totalAdjusted: row.total_adjusted === true,
    },
  };
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
    overallScore: article.overallScore,
    tags: article.tags,
    publishedAt: article.publishedAt.slice(0, 10),
    updatedAt: article.updatedAt.slice(0, 10),
    body: [],
  };
}
