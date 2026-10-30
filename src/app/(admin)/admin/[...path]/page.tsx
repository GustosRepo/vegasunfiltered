import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CmsPage } from "@/components/admin/cms-page";
import { ArticleEditor } from "@/components/admin/article-editor";
import { requireAdminPage } from "@/lib/admin-auth";
import { getSupabaseEnvironment } from "@/lib/supabase/env";

type Props = {
  params: Promise<{ path: string[] }>;
};
type EditorMedia = { id: string; url: string; altText: string; caption: string };

export default function AdminSection({ params }: Props) {
  return (
    <Suspense fallback={<div className="cms-loading">Loading editorial workspace…</div>}>
      <AdminSectionContent params={params} />
    </Suspense>
  );
}

async function AdminSectionContent({ params }: Pick<Props, "params">) {
  const { path = [] } = await params;
  const access = await requireAdminPage();
  if (access.state === "unconfigured") {
    return <p className="cms-alert">Supabase is not configured. Admin data is unavailable.</p>;
  }

  if (path[0] === "articles") {
    if (path.length === 1) return <CmsPage section="articles" />;
    if (path.length === 2 && path[1] === "new") {
      const [categories, media] = await Promise.all([
        loadCategories(access.client),
        loadMedia(access.client),
      ]);
      return <ArticleEditor categories={categories} media={media} role={access.identity.role} />;
    }
    if (path.length === 2) {
      const { data, error } = await access.client.from("articles").select("*,seo:article_seo(*)").eq("id", path[1]).maybeSingle();
      if (error) throw new Error(`Could not load article: ${error.message}`);
      if (!data) notFound();
      const [tagResult, categories, media] = await Promise.all([
        access.client.from("article_tags").select("tags(name)").eq("article_id", path[1]),
        loadCategories(access.client),
        loadMedia(access.client),
      ]);
      if (tagResult.error) throw new Error(`Could not load article tags: ${tagResult.error.message}`);
      const tags = (tagResult.data ?? []).flatMap((row: { tags: unknown }) => {
        const values = Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : [];
        return values.flatMap((tag: unknown) => typeof tag === "object" && tag !== null && "name" in tag && typeof tag.name === "string" ? [tag.name] : []);
      }).join(", ");
      return <ArticleEditor article={{ ...data, tags }} categories={categories} media={media} role={access.identity.role} />;
    }
  }
  if (path.length === 1 && ["restaurants", "visits", "media", "neighborhoods", "seo", "analytics", "team", "settings"].includes(path[0])) {
    return <CmsPage section={path[0] as "restaurants" | "visits" | "media" | "neighborhoods" | "seo" | "analytics" | "team" | "settings"} />;
  }
  if ((path[0] === "restaurants" || path[0] === "visits") && (path.length === 2 && path[1] === "new" || path.length === 3 && path[2] === "edit")) {
    const section = path[0];
    const id = path.length === 3 ? path[1] : undefined;
    return <CmsPage section={section} recordId={id} />;
  }
  return <div className="cms-empty"><strong>That editorial page is not available.</strong><Link href="/admin">Return to the overview</Link></div>;
}

async function loadCategories(client: SupabaseClient) {
  const { data, error } = await client.from("categories").select("id,name,slug").order("name");
  if (error) throw new Error(`Could not load article categories: ${error.message}`);
  return data ?? [];
}

async function loadMedia(client: SupabaseClient): Promise<EditorMedia[]> {
  const [result, environment] = await Promise.all([
    client.from("media").select("id,storage_bucket,storage_path,alt_text,caption")
      .eq("storage_bucket", "editorial-media").order("created_at", { ascending: false }).limit(100),
    Promise.resolve(getSupabaseEnvironment()),
  ]);
  if (result.error) throw new Error(`Could not load editorial media for the article editor: ${result.error.message}`);
  if (!environment) return [];
  return (result.data ?? []).map((item) => ({
    id: item.id,
    url: `${environment.url}/storage/v1/object/public/${encodeURIComponent(item.storage_bucket)}/${item.storage_path.split("/").map(encodeURIComponent).join("/")}`,
    altText: item.alt_text,
    caption: item.caption,
  }));
}
