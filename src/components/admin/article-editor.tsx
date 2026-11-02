"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { articleDraftSchema, type EditorNode } from "@/lib/cms-schemas";
import { saveArticle, transitionArticle } from "@/app/actions/articles";
import type { CmsRole } from "@/lib/admin-auth";
import { DeleteArticleButton } from "@/components/admin/destructive-action";
import { ReviewRichText, type ReviewMediaOption } from "@/components/admin/review-rich-text";
import { ReviewPhotos } from "@/components/admin/review-photos";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { blankReviewTemplate, readReviewTemplate } from "@/lib/review-template";

type Category = { id: string; name: string; slug: string };
type MediaOption = ReviewMediaOption;
type ArticleDraftValues = z.infer<typeof articleDraftSchema>;
type ArticleSeo = {
  seo_title?: string | null; meta_description?: string | null; canonical_url?: string | null; open_graph_media_id?: string | null;
  primary_keyword?: string | null; secondary_keywords?: string[] | null;
  internal_linking_notes?: string | null; indexing_enabled?: boolean | null;
};
type Article = {
  id: string; title: string; subtitle: string; slug: string; kind: ArticleDraftValues["kind"];
  category_id: string | null; featured_media_id: string | null; content: EditorNode; status: string; updated_at: string;
  restaurant_id: string | null; neighborhood_id: string | null;
  is_sponsored: boolean;
  review_type: "restaurant" | "activity"; overall_score: number | null;
  tags: string; seo?: ArticleSeo | ArticleSeo[] | null;
};

const blankDocument: EditorNode = { type: "doc", content: [{ type: "paragraph" }] };
type Tab = "content" | "photos" | "seo" | "publishing";

type ArticleContextOption = { id: string; name: string };
type PlaceOption = ArticleContextOption & { place_type: "restaurant" | "activity" };

export function ArticleEditor({ article, media, restaurants, neighborhoods, initialPlaceId, visits = [], role }: { article?: Article; categories: Category[]; media: MediaOption[]; restaurants: PlaceOption[]; neighborhoods: ArticleContextOption[]; initialPlaceId?: string; visits?: { id: string; visited_at: string }[]; role: CmsRole }) {
  const router = useRouter();
  const initialSeo = Array.isArray(article?.seo) ? article.seo[0] : article?.seo;
  const form = useForm<ArticleDraftValues>({
    resolver: zodResolver(articleDraftSchema),
    defaultValues: {
      id: article?.id,
      expectedUpdatedAt: article?.updated_at,
      title: article?.title ?? "",
      subtitle: article?.subtitle ?? "",
      slug: article?.slug ?? "",
      kind: article?.kind ?? "restaurant_review",
      reviewType: article?.review_type ?? restaurants.find((place) => place.id === initialPlaceId)?.place_type ?? "restaurant",
      overallScore: article?.overall_score ?? "",
      categoryId: article?.category_id ?? "",
      featuredMediaId: article?.featured_media_id ?? "",
      openGraphMediaId: initialSeo?.open_graph_media_id ?? "",
      restaurantId: article?.restaurant_id ?? (restaurants.some((place) => place.id === initialPlaceId) ? initialPlaceId : "") ?? "",
      neighborhoodId: article?.neighborhood_id ?? "",
      isSponsored: article?.is_sponsored ?? false,
      tags: article?.tags ?? "",
      seoTitle: initialSeo?.seo_title ?? "",
      metaDescription: initialSeo?.meta_description ?? "",
      canonicalUrl: initialSeo?.canonical_url ?? "",
      primaryKeyword: initialSeo?.primary_keyword ?? "",
      secondaryKeywords: initialSeo?.secondary_keywords?.join(", ") ?? "",
      internalLinkingNotes: initialSeo?.internal_linking_notes ?? "",
      indexingEnabled: initialSeo?.indexing_enabled ?? false,
      content: article?.content ?? blankDocument,
      reviewTemplate: article ? readReviewTemplate(article.content) ?? blankReviewTemplate() : blankReviewTemplate(),
    },
    mode: "onChange",
  });
  const [tab, setTab] = useState<Tab>("content");
  const [uploads, setUploads] = useState<MediaOption[]>([]);
  const availableMedia = [...uploads, ...media.filter((item) => !uploads.some((upload) => upload.id === item.id))];
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [saveMessage, setSaveMessage] = useState(article ? "All changes saved" : "New draft");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isTransitioning, startTransition] = useTransition();
  const saveRef = useRef(false);
  const queuedRef = useRef(false);
  const persistRef = useRef<() => Promise<void>>(async () => {});
  const watchedValues = useWatch({ control: form.control });
  const title = useWatch({ control: form.control, name: "title" });
  const reviewType = useWatch({ control: form.control, name: "reviewType" });
  const slug = useWatch({ control: form.control, name: "slug" });
  const seoTitle = useWatch({ control: form.control, name: "seoTitle" });
  const metaDescription = useWatch({ control: form.control, name: "metaDescription" });
  const template = useWatch({ control: form.control, name: "reviewTemplate" }) ?? blankReviewTemplate();
  const featuredMediaId = useWatch({ control: form.control, name: "featuredMediaId" });
  const status = article?.status ?? "draft";

  useEffect(() => {
    if (article && !form.formState.isDirty) {
      form.setValue("expectedUpdatedAt", article.updated_at, { shouldDirty: false });
    }
  }, [article, form]);

  const persist = useCallback(async () => {
    if (saveRef.current) {
      queuedRef.current = true;
      return;
    }
    const snapshot = structuredClone(form.getValues());
    saveRef.current = true;
    const valid = await form.trigger();
    if (!valid) {
      const validation = articleDraftSchema.safeParse(snapshot);
      const issue = validation.success ? undefined : validation.error.issues[0];
      const field = issue?.path.join(".") ?? "Review";
      const label = field === "title" ? "Headline" : field === "slug" ? "URL slug" : field;
      setSaveMessage(`Not saved — ${label}: ${field === "slug" ? "Use lowercase words separated by hyphens, for example spring-valley-dinner." : issue?.message ?? "Check required fields."}`);
      saveRef.current = false;
      return;
    }
    setSaveMessage("Saving…");
    let result: Awaited<ReturnType<typeof saveArticle>>;
    try {
      result = await saveArticle(snapshot);
    } catch (error) {
      setSaveMessage(error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Retry your changes.");
      saveRef.current = false;
      return;
    }
    if (!result.ok || !result.id || !result.updatedAt) {
      setSaveMessage(result.message);
      saveRef.current = false;
      return;
    }
    form.setValue("id", result.id, { shouldDirty: false });
    form.setValue("expectedUpdatedAt", result.updatedAt, { shouldDirty: false });
    const current = form.getValues();
    const changedDuringSave = JSON.stringify({ ...current, id: undefined, expectedUpdatedAt: undefined }) !== JSON.stringify({ ...snapshot, id: undefined, expectedUpdatedAt: undefined });
    if (!changedDuringSave) {
      form.reset({ ...snapshot, id: result.id, expectedUpdatedAt: result.updatedAt });
    }
    setSaveMessage(changedDuringSave ? "Saving newer changes…" : "All changes saved");
    if (!changedDuringSave && !article && typeof window !== "undefined" && window.location.pathname.endsWith("/new")) {
      router.replace(`/admin/reviews/${result.id}`);
    }
    saveRef.current = false;
    if (queuedRef.current || changedDuringSave) {
      queuedRef.current = false;
      window.setTimeout(() => void persistRef.current(), 0);
    }
  }, [article, form, router]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    let timeout = 0;
    timeout = window.setTimeout(() => void persistRef.current(), 1600);
    return () => window.clearTimeout(timeout);
  }, [form.formState.isDirty, watchedValues]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    const warnBeforeNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || link.target && link.target !== "_self") return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm("This review has unsaved changes or a save is still in progress. Stay here and wait for “All changes saved” to keep your work. Leave without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", warnBeforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeave);
      document.removeEventListener("click", warnBeforeNavigation, true);
    };
  }, [form.formState.isDirty]);

  const publish = (targetStatus: "in_review" | "approved" | "published" | "draft" | "archived") => {
    void form.handleSubmit(async (values) => {
      const saved = await saveArticle(values);
      if (!saved.ok || !saved.id || !saved.updatedAt) {
        setTransitionMessage(saved.message);
        return;
      }
      form.reset({ ...values, id: saved.id, expectedUpdatedAt: saved.updatedAt });
      startTransition(async () => {
        const result = await transitionArticle({ articleId: saved.id, targetStatus });
        setTransitionMessage(result.message);
        if (result.ok) router.refresh();
      });
    })();
  };
  const schedule = () => {
    void form.handleSubmit(async (values) => {
      const saved = await saveArticle(values);
      if (!saved.ok || !saved.id || !saved.updatedAt) {
        setTransitionMessage(saved.message);
        return;
      }
      form.reset({ ...values, id: saved.id, expectedUpdatedAt: saved.updatedAt });
      startTransition(async () => {
        const result = await transitionArticle({ articleId: saved.id, targetStatus: "scheduled", scheduledLocal });
        setTransitionMessage(result.message);
        if (result.ok) router.refresh();
      });
    })();
  };

  return <>
    <div className="cms-page-heading"><div><span className="cms-overline">REVIEW WORKSPACE · {status.replace("_", " ").toUpperCase()}</span><h1>{article ? "Edit review" : "New review"}</h1><p>The story, the experience, and your verdict belong together. Save before opening linked place or visit records.</p></div><div className="cms-heading-actions"><Link className="cms-secondary-button" href="/admin/reviews">Back to reviews</Link>{article && <Link className="cms-secondary-button" href={`/admin/reviews/${article.id}/preview`}>Private preview</Link>}{article && role !== "contributor" && <Link className="cms-secondary-button" href={`/admin/visits/new?review=${article.id}`}>Record this visit</Link>}{article && (role === "owner" || role === "editor") && <DeleteArticleButton id={article.id} />}</div></div>
    {visits.length > 0 && <section className="cms-panel cms-panel-body" aria-label="Visits for this review"><h2>Visits and receipts</h2>{visits.map((visit) => <p key={visit.id}><Link href={`/admin/visits/${visit.id}/edit`}>Edit visit from {visit.visited_at}</Link></p>)}</section>}
    <div className="cms-editor-layout">
      <section className="cms-panel">
        <nav className="cms-tabs" aria-label="Article editor sections">
          {(["content", "photos", "seo", "publishing"] as const).map((value) => <button key={value} aria-selected={tab === value} onClick={() => setTab(value)} role="tab" type="button">{value[0].toUpperCase() + value.slice(1)}</button>)}
        </nav>
        <form onSubmit={(event) => { event.preventDefault(); void persistRef.current(); }}>
          {tab === "content" && <>
            <div className="cms-form-grid">
              <InputField error={form.formState.errors.title?.message} label="Headline" {...form.register("title")} />
              <InputField error={form.formState.errors.slug?.message} label="URL slug" {...form.register("slug")} />
              <InputField className="cms-form-span" error={form.formState.errors.subtitle?.message} label="Subtitle / dek" {...form.register("subtitle")} />
              <label className="cms-field"><span className="cms-label">Review type</span><select {...form.register("reviewType", { onChange: () => form.setValue("restaurantId", "", { shouldDirty: true }) })}><option value="restaurant">Restaurant</option><option value="activity">Activity</option></select></label>
              <InputField label="Overall score (0–10, optional)" type="number" min={0} max={10} step={0.1} error={form.formState.errors.overallScore?.message} {...form.register("overallScore", { setValueAs: (value: string | number) => value === "" ? "" : Number(value) })} />
              <p className="cms-muted cms-form-span">Leave the score blank until you have a verdict. This is your editorial opinion, not an average of customer ratings. Use tags for cuisine, drinks, date nights, and budget.</p>
              <label className="cms-field"><span className="cms-label">Featured image</span><select {...form.register("featuredMediaId")}><option value="">No featured image</option>{availableMedia.map((item) => <option key={item.id} value={item.id}>{item.altText || item.caption || item.id}</option>)}</select></label>
              {role !== "contributor" && <>
                <label className="cms-field"><span className="cms-label">Place reviewed</span><select {...form.register("restaurantId")}><option value="">Not linked yet</option>{restaurants.filter((place) => place.place_type === reviewType).map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
                <div className="cms-field"><span className="cms-label">Place details</span><Link href="/admin/places/new">Add a place</Link>{article?.restaurant_id && <Link href={`/admin/places/${article.restaurant_id}/edit`}>Edit linked place</Link>}</div>
                <label className="cms-field"><span className="cms-label">Neighborhood</span><select {...form.register("neighborhoodId")}><option value="">No neighborhood</option>{neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>)}</select></label>
                <label className="cms-checkbox-field cms-form-span"><input type="checkbox" {...form.register("isSponsored")} /> Mark as sponsored content and show the public disclosure label</label>
              </>}
              <InputField className="cms-form-span" error={form.formState.errors.tags?.message} label="Tags (comma-separated)" {...form.register("tags")} />
              <label className="cms-field cms-form-span"><span className="cms-label">Quick verdict</span><textarea maxLength={1500} placeholder="Your short, honest takeaway." {...form.register("reviewTemplate.quickVerdict")} /></label>
              <InputField label="Visit date (public, optional)" type="date" error={form.formState.errors.reviewTemplate?.visitedAt?.message} {...form.register("reviewTemplate.visitedAt")} />
              <InputField label="Price / budget" maxLength={120} placeholder="e.g. $80 per person, including drinks" {...form.register("reviewTemplate.priceRange")} />
              <InputField className="cms-form-span" label="Best for" maxLength={240} placeholder="e.g. A relaxed date night" {...form.register("reviewTemplate.bestFor")} />
            </div>
            <section className="cms-review-section"><h2>Our experience</h2><p className="cms-muted">Tell the story of your visit. Existing article text stays here. Insert photos between paragraphs using the media picker.</p>
              <ReviewRichText label="Article body" content={form.getValues("content")} media={availableMedia} onChange={(content) => form.setValue("content", content, { shouldDirty: true, shouldValidate: true })} />
            </section>
            {([
              ["tried", "What we tried", reviewType === "activity" ? "Describe the activities, tickets, or experiences and what they cost." : "Describe the dishes and drinks, prices, and what you thought."],
              ["worthKnowing", "Worth knowing", "Standouts, drawbacks, reservations, parking, and practical tips."],
              ["returnVerdict", "Would we go back?", "Your final recommendation and who you would recommend it to."],
            ] as const).map(([field, label, hint]) => <section className="cms-review-section" key={field}><h2>{label}</h2><p className="cms-muted">{hint} Leave blank to hide this section.</p>
              <ReviewRichText label={label} content={form.getValues(`reviewTemplate.${field}`) ?? blankDocument} media={availableMedia} onChange={(content) => form.setValue(`reviewTemplate.${field}`, content, { shouldDirty: true, shouldValidate: true })} />
            </section>)}
          </>}
          {tab === "photos" && <ReviewPhotos media={availableMedia} photos={template.gallery} featuredMediaId={featuredMediaId}
            onCoverChange={(id) => form.setValue("featuredMediaId", id, { shouldDirty: true })}
            onChange={(photos) => form.setValue("reviewTemplate.gallery", photos, { shouldDirty: true, shouldValidate: true })} />}
          {tab === "seo" && <div className="cms-form-grid">
            <InputField className="cms-form-span" label="SEO title" maxLength={70} {...form.register("seoTitle")} />
            <InputField className="cms-form-span" label="Meta description" maxLength={180} {...form.register("metaDescription")} />
            <InputField className="cms-form-span" label="Canonical URL (HTTPS)" {...form.register("canonicalUrl")} />
            <label className="cms-field cms-form-span"><span className="cms-label">Social sharing image</span><select {...form.register("openGraphMediaId")}><option value="">Use featured image</option>{availableMedia.map((item) => <option key={item.id} value={item.id}>{item.altText || item.caption || item.id}</option>)}</select></label>
            <InputField label="Primary keyword" {...form.register("primaryKeyword")} />
            <InputField label="Secondary keywords (comma-separated)" {...form.register("secondaryKeywords")} />
            <label className="cms-field cms-form-span"><span className="cms-label">Internal linking notes</span><textarea {...form.register("internalLinkingNotes")} /></label>
            <label className="cms-checkbox-field cms-form-span"><input type="checkbox" {...form.register("indexingEnabled")} /> Allow search engines to index this article once published</label>
            <div className="cms-form-span cms-seo-preview"><b>{seoTitle || title || "Article title preview"}</b><a href="#">{`https://vegasunfiltered.com/${slug || "article-slug"}`}</a><p>{metaDescription || "Add a concise description to preview how this story may appear in search results."}</p></div>
          </div>}
          {tab === "publishing" && <div className="cms-panel-body">
            <div className="cms-alert"><span>Review status: <b>{status.replace("_", " ")}</b>. Scheduled publication requires the configured hourly Vercel Cron endpoint.</span></div>
            <label className="cms-field"><span className="cms-label">Schedule for (Las Vegas time)</span><input onChange={(event) => setScheduledLocal(event.target.value)} type="datetime-local" value={scheduledLocal} /></label>
            <div className="cms-heading-actions">
              {status === "draft" && <button className="cms-secondary-button" onClick={() => publish("in_review")} type="button">Submit for review</button>}
              {(role === "owner" || role === "editor") && status === "in_review" && <button className="cms-secondary-button" onClick={() => publish("approved")} type="button">Approve for publication</button>}
              {(role === "owner" || role === "editor") && (status === "approved" || status === "scheduled") && <button className="cms-primary-button" onClick={() => publish("published")} type="button">Publish now</button>}
              {(role === "owner" || role === "editor") && (status === "approved" || status === "scheduled") && <button className="cms-secondary-button" onClick={schedule} type="button">Schedule</button>}
              {(role === "owner" || role === "editor") && status === "published" && <button className="cms-secondary-button" onClick={() => publish("draft")} type="button">Unpublish</button>}
              {(role === "owner" || role === "editor") && status !== "archived" && <button className="cms-secondary-button" onClick={() => publish("archived")} type="button">Archive</button>}
            </div>
            {transitionMessage && <p className="cms-alert" role="status">{transitionMessage}</p>}
            <p className="cms-muted">Publishing and review actions are available only to roles authorized by the server policy.</p>
          </div>}
          <div className="cms-save-row"><span className="cms-save-state" data-state={saveMessage === "All changes saved" ? "saved" : "pending"} role="status">{form.formState.isDirty && ["All changes saved", "New draft"].includes(saveMessage) ? "Unsaved changes" : saveMessage}</span><button className="cms-primary-button" disabled={isTransitioning || saveMessage === "Saving…"} type="submit">{isTransitioning ? "Changing status…" : saveMessage === "Saving…" ? "Saving…" : "Save draft"}</button></div>
        </form>
        {tab === "photos" && <section className="cms-review-section"><h2>Upload a photo</h2><p className="cms-muted">Uploads are added to the shared media library and this review gallery. Save the review to keep its photo selections. Removing a gallery photo does not delete the original.</p>
          {template.gallery.length >= 50 ? <p className="cms-alert">Remove a gallery photo before uploading another here, or use the main Media library.</p> : <MediaUploadForm onUploaded={(image) => {
            setUploads((current) => [image, ...current]);
            const gallery = form.getValues("reviewTemplate.gallery") ?? [];
            if (gallery.length >= 50) return "Image uploaded to the media library. The gallery is full; remove a photo before adding this one.";
            form.setValue("reviewTemplate.gallery", [...gallery, {
              mediaId: image.id, url: image.url, altText: image.altText, caption: image.caption, credit: image.credit ?? "",
            }], { shouldDirty: true, shouldValidate: true });
          }} />}
        </section>}
      </section>
    </div>
  </>;
}

function InputField({ label, className = "", error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <label className={`cms-field ${className}`}><span className="cms-label">{label}</span><input {...props} />{error && <small className="cms-form-error">{error}</small>}</label>;
}
