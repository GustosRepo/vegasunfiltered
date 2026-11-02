import Link from "next/link";
import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CmsPage } from "@/components/admin/cms-page";
import { ArticleEditor } from "@/components/admin/article-editor";
import { CmsPublishedArticle } from "@/components/cms-published-article";
import { requireAdminPage } from "@/lib/admin-auth";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import { reviewSection } from "@/lib/content";
import { readReviewTemplate } from "@/lib/review-template";

type Props = {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ place?: string; review?: string }>;
};
type EditorMedia = { id: string; url: string; altText: string; caption: string; credit: string };

export default function AdminSection({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<div className="cms-loading">Loading editorial workspace…</div>}>
      <AdminSectionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminSectionContent({ params, searchParams }: Props) {
  const { path = [] } = await params;
  if (path[0] === "articles" || path[0] === "restaurants") {
    permanentRedirect(`/admin/${path[0] === "articles" ? "reviews" : "places"}${path.length > 1 ? `/${path.slice(1).join("/")}` : ""}`);
  }
  const access = await requireAdminPage();
  if (access.state === "unconfigured") {
    return <p className="cms-alert">Supabase is not configured. Admin data is unavailable.</p>;
  }

  const query = await searchParams;
  if (path[0] === "reviews") {
    if (path.length === 1) return <CmsPage section="articles" />;
    if (path.length === 2 && path[1] === "new") {
      const [categories, media, context] = await Promise.all([
        loadCategories(access.client),
        loadMedia(access.client),
        loadArticleContext(access.client, access.identity.role),
      ]);
      return <ArticleEditor recoveryUserId={access.identity.id} categories={categories} media={media} {...context} initialPlaceId={query.place} role={access.identity.role} />;
    }
    const editId = path.length === 2 && path[1] !== "new"
      ? path[1]
      : path.length === 3 && path[2] === "edit" ? path[1] : null;
    if (editId) {
      const { data, error } = await access.client.from("articles").select("*,seo:article_seo(*)").eq("id", editId).maybeSingle();
      if (error) throw new Error(`Could not load article: ${error.message}`);
      if (!data) notFound();
      const seo = Array.isArray(data.seo) ? data.seo[0] : data.seo;
      const selectedMediaIds = [
        data.featured_media_id, seo?.open_graph_media_id,
        ...(readReviewTemplate(data.content)?.gallery.map((photo) => photo.mediaId) ?? []),
      ].filter((id): id is string => typeof id === "string");
      const [tagResult, categories, media, context, visits] = await Promise.all([
        access.client.from("article_tags").select("tags(name)").eq("article_id", editId),
        loadCategories(access.client),
        loadMedia(access.client, selectedMediaIds),
        loadArticleContext(access.client, access.identity.role),
        access.identity.role === "contributor" ? Promise.resolve({ data: [], error: null })
          : access.client.from("restaurant_visits").select("id,visited_at").eq("article_id", editId).order("visited_at", { ascending: false }),
      ]);
      if (tagResult.error) throw new Error(`Could not load article tags: ${tagResult.error.message}`);
      if (visits.error) throw new Error(`Could not load review visits: ${visits.error.message}`);
      const tags = (tagResult.data ?? []).flatMap((row: { tags: unknown }) => {
        const values = Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : [];
        return values.flatMap((tag: unknown) => typeof tag === "object" && tag !== null && "name" in tag && typeof tag.name === "string" ? [tag.name] : []);
      }).join(", ");
      return <ArticleEditor recoveryUserId={access.identity.id} article={{ ...data, tags }} categories={categories} media={media} {...context} visits={visits.data ?? []} role={access.identity.role} />;
    }
    if (path.length === 3 && path[2] === "preview") {
      const { data, error } = await access.client.from("articles")
        .select("id,title,subtitle,slug,content,restaurant_id,neighborhood_id,review_type,overall_score,is_indexable,is_sponsored,published_at,updated_at,category:categories(name,slug),seo:article_seo(seo_title,meta_description,canonical_url,indexing_enabled),featured:media!articles_featured_media_fk(storage_bucket,storage_path,alt_text,caption)")
        .eq("id", path[1]).maybeSingle();
      if (error) throw new Error(`Could not load article preview: ${error.message}`);
      if (!data) notFound();
      const [place, neighborhood] = await Promise.all([
        data.restaurant_id && access.identity.role !== "contributor"
          ? access.client.from("restaurants").select("name,cuisine,address,city,state,postal_code,website").eq("id", data.restaurant_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        data.neighborhood_id
          ? access.client.from("neighborhoods").select("name,slug,description").eq("id", data.neighborhood_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (place.error) throw new Error(`Could not load preview place: ${place.error.message}`);
      if (neighborhood.error) throw new Error(`Could not load preview neighborhood: ${neighborhood.error.message}`);
      const seo = Array.isArray(data.seo) ? data.seo[0] : data.seo;
      const featured = Array.isArray(data.featured) ? data.featured[0] : data.featured;
      const env = getSupabaseEnvironment();
      const image = env && featured?.storage_path
        ? `${env.url}/storage/v1/object/public/${encodeURIComponent(featured.storage_bucket)}/${featured.storage_path.split("/").map(encodeURIComponent).join("/")}`
        : "";
      const article = {
        id: data.id,
        title: data.title,
        subtitle: data.subtitle ?? "",
        slug: data.slug,
        categorySlug: reviewSection(data.review_type === "activity" ? "activity" : "restaurant"),
        categoryName: data.review_type === "activity" ? "Activities" : "Restaurants",
        reviewType: data.review_type === "activity" ? "activity" as const : "restaurant" as const,
        overallScore: data.overall_score === null ? null : Number(data.overall_score),
        tags: [],
        publishedAt: data.published_at ?? data.updated_at,
        updatedAt: data.updated_at,
        content: data.content,
        image,
        imageAlt: featured?.alt_text ?? "",
        imageCaption: featured?.caption ?? "",
        openGraphImage: "",
        seoTitle: seo?.seo_title ?? "",
        metaDescription: seo?.meta_description ?? "",
        canonicalUrl: seo?.canonical_url ?? "",
        indexable: false,
        publicReceiptUrl: null,
        receipt: null,
        authorName: null,
        affiliateLinks: [],
        restaurant: place.data ? {
          name: place.data.name, cuisine: place.data.cuisine, address: place.data.address,
          city: place.data.city, state: place.data.state, postalCode: place.data.postal_code,
          website: place.data.website?.startsWith("https://") ? place.data.website : null,
        } : null,
        neighborhood: neighborhood.data,
        sponsored: data.is_sponsored === true,
      };
      return <><p className="cms-alert">Private preview — only signed-in editorial staff can view this unpublished content.</p><CmsPublishedArticle article={article} isPreview /></>;
    }
  }
  if (path[0] === "places") path[0] = "restaurants";
  if (path.length === 1 && ["restaurants", "visits", "media", "neighborhoods", "seo", "analytics", "team", "settings", "affiliates"].includes(path[0])) {
    return <CmsPage section={path[0] as "restaurants" | "visits" | "media" | "neighborhoods" | "seo" | "analytics" | "team" | "settings" | "affiliates"} initialReviewId={query.review} />;
  }
  if ((path[0] === "restaurants" || path[0] === "visits") && (path.length === 2 && path[1] === "new" || path.length === 3 && path[2] === "edit")) {
    const section = path[0];
    const id = path.length === 3 ? path[1] : undefined;
    return <CmsPage section={section} recordId={id} isNew={!id} initialReviewId={query.review} />;
  }
  return <div className="cms-empty"><strong>That editorial page is not available.</strong><Link href="/admin">Return to the overview</Link></div>;
}

async function loadCategories(client: SupabaseClient) {
  const { data, error } = await client.from("categories").select("id,name,slug").order("name");
  if (error) throw new Error(`Could not load article categories: ${error.message}`);
  return data ?? [];
}

async function loadMedia(client: SupabaseClient, selectedIds: string[] = []): Promise<EditorMedia[]> {
  const [result, selected, environment] = await Promise.all([
    client.from("media").select("id,storage_bucket,storage_path,alt_text,caption,photographer_credit")
      .eq("storage_bucket", "editorial-media").order("created_at", { ascending: false }).limit(100),
    selectedIds.length ? client.from("media").select("id,storage_bucket,storage_path,alt_text,caption,photographer_credit")
      .eq("storage_bucket", "editorial-media").in("id", selectedIds) : Promise.resolve({ data: [], error: null }),
    Promise.resolve(getSupabaseEnvironment()),
  ]);
  if (result.error) throw new Error(`Could not load editorial media for the article editor: ${result.error.message}`);
  if (selected.error) throw new Error(`Could not load selected review photos: ${selected.error.message}`);
  if (!environment) return [];
  const items = [...(selected.data ?? []), ...(result.data ?? [])];
  return [...new Map(items.map((item) => [item.id, item])).values()].map((item) => ({
    id: item.id,
    url: `${environment.url}/storage/v1/object/public/${encodeURIComponent(item.storage_bucket)}/${item.storage_path.split("/").map(encodeURIComponent).join("/")}`,
    altText: item.alt_text,
    caption: item.caption,
    credit: item.photographer_credit,
  }));
}

async function loadArticleContext(client: SupabaseClient, role: "owner" | "editor" | "contributor") {
  if (role === "contributor") return { restaurants: [], neighborhoods: [] };
  const [restaurants, neighborhoods] = await Promise.all([
    client.from("restaurants").select("id,name,place_type").order("name").limit(500),
    client.from("neighborhoods").select("id,name").order("name").limit(500),
  ]);
  if (restaurants.error) throw new Error(`Could not load article restaurants: ${restaurants.error.message}`);
  if (neighborhoods.error) throw new Error(`Could not load article neighborhoods: ${neighborhoods.error.message}`);
  return { restaurants: restaurants.data ?? [], neighborhoods: neighborhoods.data ?? [] };
}
