"use server";

import { revalidatePath, updateTag } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { getAdminIdentity, requireCmsRole, type CmsRole } from "@/lib/admin-auth";
import { withReviewTemplate } from "@/lib/review-template";
import {
  articleDraftSchema,
  isEditorDocument,
} from "@/lib/cms-schemas";

export type CmsActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  updatedAt?: string;
};

const transitionSchema = z.object({
  articleId: z.string().uuid(),
  targetStatus: z.enum([
    "in_review",
    "approved",
    "scheduled",
    "published",
    "draft",
    "archived",
  ]),
  scheduledLocal: z.string().optional(),
});

export async function saveArticle(input: unknown): Promise<CmsActionResult> {
  const parsed = articleDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check article fields." };
  }
  if (!isEditorDocument(parsed.data.content)) {
    return { ok: false, message: "The article body contains unsupported content." };
  }

  const access = await getAdminIdentity();
  if (!access.client || !access.identity) return { ok: false, message: access.accessError ?? "Your CMS session is unavailable. Sign in again before saving; keep this tab open to retain your writing." };
  const { data, error } = await access.client.rpc("save_review", {
    p_review: {
      ...parsed.data,
      content: withReviewTemplate(parsed.data.content, parsed.data.reviewTemplate),
      seo: {
        seo_title: parsed.data.seoTitle,
        meta_description: parsed.data.metaDescription,
        canonical_url: "",
        primary_keyword: parsed.data.primaryKeyword,
        secondary_keywords: parsed.data.secondaryKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        internal_linking_notes: parsed.data.internalLinkingNotes,
        indexing_enabled: parsed.data.indexingEnabled,
      },
      tags: parsed.data.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    },
  });
  if (error) {
    if (error.code === "40001" || error.message.includes("ARTICLE_CONFLICT")) {
      return {
        ok: false,
        message:
          "Another editor changed this article. Reload the latest version before saving your changes.",
      };
    }
    if (error.code === "23505") {
      return { ok: false, message: "That URL slug is already in use." };
    }
    if (error.code === "42501") {
      const { data: deadline, error: sessionError } = await access.client.rpc("cms_session_deadline");
      if (sessionError) return { ok: false, message: `Could not verify CMS session permissions: ${sessionError.message}` };
      if (!deadline) return { ok: false, message: "Your CMS session expired while saving. Sign in again; keep this tab open to retain your writing." };
      return { ok: false, message: `Review was not saved. Database permission check failed for ${access.identity.role}: ${error.message}. Check that the CMS migrations are applied and sign in again after role changes.` };
    }
    return { ok: false, message: `Article was not saved: ${error.message}` };
  }

  const saved = Array.isArray(data) ? data[0] : null;
  if (!saved || typeof saved.id !== "string" || typeof saved.updated_at !== "string") {
    throw new Error("Article save completed without a valid result.");
  }
  revalidatePath("/admin/reviews");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  return {
    ok: true,
    message: "Saved",
    id: saved.id,
    updatedAt: saved.updated_at,
  };
}

export async function transitionArticle(input: unknown): Promise<CmsActionResult> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "The requested publishing change is invalid." };
  }
  const allowed: readonly CmsRole[] =
    parsed.data.targetStatus === "in_review"
      ? ["owner", "editor", "contributor"] as const
      : ["owner", "editor"] as const;
  const { client, identity, accessError } = await getAdminIdentity();
  if (!client || !identity) return { ok: false, message: accessError ?? "Your session expired. Sign in again before changing publication status." };
  if (!allowed.includes(identity.role)) return { ok: false, message: "Your role does not allow that publishing action." };

  let scheduledAt: string | null = null;
  if (parsed.data.targetStatus === "scheduled") {
    if (!process.env.CRON_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { ok: false, message: "Automatic publishing is not configured in this environment. Publish an approved review manually, or configure scheduled publishing first." };
    }
    const localDateTime = parsed.data.scheduledLocal;
    if (!localDateTime || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) {
      return { ok: false, message: "Choose a valid publication date and time." };
    }
    const converted = fromZonedTime(localDateTime, "America/Los_Angeles");
    if (Number.isNaN(converted.getTime()) || converted.getTime() <= Date.now()) {
      return { ok: false, message: "Choose a future time in America/Los_Angeles." };
    }
    scheduledAt = converted.toISOString();
  }

  if (parsed.data.targetStatus === "published" || parsed.data.targetStatus === "scheduled") {
    const { data: review, error: reviewError } = await client.from("articles").select("restaurant_id,review_type").eq("id", parsed.data.articleId).maybeSingle();
    if (reviewError) return { ok: false, message: `Could not check the review's place: ${reviewError.message}` };
    if (!review) return { ok: false, message: "This review is unavailable. Reload the review list." };
    if (!review.restaurant_id) return { ok: false, message: "Link a restaurant or activity place in Content before publishing or scheduling. You can still save an unlinked draft." };
    const { data: place, error: placeError } = await client.from("restaurants").select("place_type").eq("id", review.restaurant_id).maybeSingle();
    if (placeError) return { ok: false, message: `Could not check the linked place: ${placeError.message}` };
    if (!place || place.place_type !== review.review_type) return { ok: false, message: "Choose an available place matching this review's type before publishing or scheduling." };
  }
  const { error } = await client.rpc("transition_article", {
    p_article_id: parsed.data.articleId,
    p_target_status: parsed.data.targetStatus,
    p_scheduled_at: scheduledAt,
  });
  if (error) {
    if (error.code === "42501") {
      return { ok: false, message: "Your role does not allow that publishing action." };
    }
    return { ok: false, message: `Publishing status was not changed: ${error.message}` };
  }
  revalidatePath("/admin/reviews");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  return { ok: true, message: "Publishing status updated." };
}

export async function deleteArticle(articleId: string): Promise<CmsActionResult> {
  const parsed = z.string().uuid().safeParse(articleId);
  if (!parsed.success) return { ok: false, message: "Article ID is invalid." };
  const { client } = await requireCmsRole(["owner", "editor"]);
  const { error } = await client.from("articles").delete().eq("id", parsed.data);
  if (error) {
    return { ok: false, message: `Article was not deleted: ${error.message}` };
  }
  revalidatePath("/admin/reviews");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  return { ok: true, message: "Article deleted." };
}

export async function duplicateArticle(input: string | FormData): Promise<CmsActionResult> {
  const articleId = input instanceof FormData ? String(input.get("articleId") ?? "") : input;
  const parsedId = z.string().uuid().safeParse(articleId);
  if (!parsedId.success) return { ok: false, message: "Article ID is invalid." };
  const { client, identity } = await requireCmsRole(["owner", "editor", "contributor"]);
  const { data: article, error: articleError } = await client
    .from("articles")
    .select("title, subtitle, slug, kind, review_type, overall_score, category_id, featured_media_id, restaurant_id, neighborhood_id, is_sponsored, content")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (articleError) throw new Error(`Could not load article to duplicate: ${articleError.message}`);
  if (!article) return { ok: false, message: "Article not found or you cannot access it." };

  const { data: seo, error: seoError } = await client
    .from("article_seo")
    .select("seo_title, meta_description, canonical_url, open_graph_media_id, primary_keyword, secondary_keywords, internal_linking_notes")
    .eq("article_id", parsedId.data)
    .maybeSingle();
  if (seoError) throw new Error(`Could not load article SEO: ${seoError.message}`);

  const { data: tags, error: tagsError } = await client
    .from("article_tags")
    .select("tags(name)")
    .eq("article_id", parsedId.data);
  if (tagsError) throw new Error(`Could not load article tags: ${tagsError.message}`);
  const tagNames = (tags ?? [])
    .map((tag) => tag.tags)
    .flatMap((tag) => (Array.isArray(tag) ? tag : tag ? [tag] : []))
    .map((tag) => (typeof tag === "object" && tag !== null && "name" in tag ? tag.name : ""))
    .filter((name): name is string => typeof name === "string");

  return saveArticle({
    title: `Copy of ${article.title}`.slice(0, 160),
    subtitle: article.subtitle,
    slug: `${article.slug}-copy-${Date.now().toString(36)}`,
    kind: article.kind,
    reviewType: article.review_type,
    overallScore: article.overall_score ?? "",
    categoryId: article.category_id ?? "",
    featuredMediaId: article.featured_media_id ?? "",
    openGraphMediaId: seo?.open_graph_media_id ?? "",
    restaurantId: identity.role === "contributor" ? "" : article.restaurant_id ?? "",
    neighborhoodId: identity.role === "contributor" ? "" : article.neighborhood_id ?? "",
    isSponsored: identity.role !== "contributor" && article.is_sponsored === true,
    tags: tagNames.join(", "),
    seoTitle: seo?.seo_title ?? "",
    metaDescription: seo?.meta_description ?? "",
    primaryKeyword: seo?.primary_keyword ?? "",
    secondaryKeywords: Array.isArray(seo?.secondary_keywords)
      ? seo.secondary_keywords.join(", ")
      : "",
    internalLinkingNotes: seo?.internal_linking_notes ?? "",
    indexingEnabled: false,
    content: article.content,
  });
}
