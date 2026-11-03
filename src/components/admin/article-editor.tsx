"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { articleDraftSchema, type EditorNode } from "@/lib/cms-schemas";
import { saveArticle, transitionArticle, type CmsActionResult } from "@/app/actions/articles";
import type { CmsRole } from "@/lib/admin-auth";
import { DeleteArticleButton } from "@/components/admin/destructive-action";
import { ReviewRichText, type ReviewMediaOption } from "@/components/admin/review-rich-text";
import { ReviewPhotos } from "@/components/admin/review-photos";
import { MediaUploadForm } from "@/components/admin/media-upload-form";
import { blankReviewTemplate, readReviewTemplate, reviewSections } from "@/lib/review-template";
import { InlinePlace, type ReviewPlace } from "@/components/admin/inline-place";
import { reviewSection } from "@/lib/content";
import { SITE_NAME } from "@/lib/site";
import { getArticleCanonicalUrl } from "@/lib/article-canonical";
import { publicationLocalTime } from "@/lib/publication-time";

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
  review_type: "restaurant" | "activity"; overall_score: number | null; scheduled_at?: string | null;
  tags: string; seo?: ArticleSeo | ArticleSeo[] | null;
};

const blankDocument: EditorNode = { type: "doc", content: [{ type: "paragraph" }] };
const editorTabs = [
  { id: "content", label: "Content" }, { id: "photos", label: "Photos" },
  { id: "seo", label: "SEO" }, { id: "publishing", label: "Publishing" },
] as const;
type Tab = (typeof editorTabs)[number]["id"];

function validationField(path: string): { label: string; tab: Tab } {
  const seoFields: Record<string, string> = {
    seoTitle: "SEO title", metaDescription: "Meta description",
    openGraphMediaId: "Social sharing image", primaryKeyword: "Primary keyword",
    secondaryKeywords: "Secondary keywords", internalLinkingNotes: "Internal linking notes",
  };
  if (seoFields[path]) return { label: seoFields[path], tab: "seo" };
  if (path.startsWith("reviewTemplate.gallery")) return { label: "Photo gallery", tab: "photos" };
  const labels: Record<string, string> = {
    title: "Headline", slug: "URL slug", subtitle: "Subtitle", overallScore: "Overall score",
    tags: "Tags", "reviewTemplate.visitedAt": "Visit date", "reviewTemplate.quickVerdict": "Quick verdict",
  };
  return { label: labels[path] ?? "Review content", tab: "content" };
}

type ArticleContextOption = { id: string; name: string };
type PlaceOption = ArticleContextOption & { place_type: "restaurant" | "activity" };

export function ArticleEditor({ article, media, restaurants, neighborhoods, initialPlaceId, initialTab = "content", schedulingConfigured = false, visits = [], role, recoveryUserId }: { article?: Article; categories: Category[]; media: MediaOption[]; restaurants: PlaceOption[]; neighborhoods: ArticleContextOption[]; initialPlaceId?: string; initialTab?: Tab; schedulingConfigured?: boolean; visits?: { id: string; visited_at: string }[]; role: CmsRole; recoveryUserId?: string }) {
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
      primaryKeyword: initialSeo?.primary_keyword ?? "",
      secondaryKeywords: initialSeo?.secondary_keywords?.join(", ") ?? "",
      internalLinkingNotes: initialSeo?.internal_linking_notes ?? "",
      indexingEnabled: initialSeo?.indexing_enabled ?? false,
      content: article?.content ?? blankDocument,
      reviewTemplate: article ? readReviewTemplate(article.content) ?? blankReviewTemplate() : blankReviewTemplate(),
    },
    mode: "onChange",
  });
  const [tab, setTab] = useState<Tab>(initialTab);
  const editorId = useId();
  const [createdPlaces, setCreatedPlaces] = useState<ReviewPlace[]>([]);
  const [placeSearch, setPlaceSearch] = useState("");
  const [creatingPlace, setCreatingPlace] = useState(false);
  const availablePlaces = [...createdPlaces, ...restaurants.filter((place) => !createdPlaces.some((created) => created.id === place.id))];
  const [uploads, setUploads] = useState<MediaOption[]>([]);
  const availableMedia = [...uploads, ...media.filter((item) => !uploads.some((upload) => upload.id === item.id))];
  const [scheduledLocal, setScheduledLocal] = useState(() => publicationLocalTime(article?.scheduled_at));
  const [saveMessage, setSaveMessage] = useState(article ? "All changes saved" : "New draft");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isTransitioning, startTransition] = useTransition();
  const saveRef = useRef(false);
  const savePromiseRef = useRef<Promise<CmsActionResult | null> | null>(null);
  const changingStatusRef = useRef(false);
  const persistRef = useRef<(showErrors?: boolean) => Promise<CmsActionResult | null>>(async () => null);
  const watchedValues = useWatch({ control: form.control });
  const title = useWatch({ control: form.control, name: "title" });
  const reviewType = useWatch({ control: form.control, name: "reviewType" });
  const slug = useWatch({ control: form.control, name: "slug" });
  const seoTitle = useWatch({ control: form.control, name: "seoTitle" });
  const metaDescription = useWatch({ control: form.control, name: "metaDescription" });
  const subtitle = useWatch({ control: form.control, name: "subtitle" });
  const indexingEnabled = useWatch({ control: form.control, name: "indexingEnabled" });
  const openGraphMediaId = useWatch({ control: form.control, name: "openGraphMediaId" });
  const template = useWatch({ control: form.control, name: "reviewTemplate" }) ?? blankReviewTemplate();
  const featuredMediaId = useWatch({ control: form.control, name: "featuredMediaId" });
  const selectedPlaceId = useWatch({ control: form.control, name: "restaurantId" });
  const status = article?.status ?? "draft";
  const canPublish = role !== "contributor";
  const previewUrl = getArticleCanonicalUrl({ categorySlug: reviewSection(reviewType), slug: slug || "review-slug" });
  const previewTitle = seoTitle || (title ? `${title} | ${SITE_NAME}` : "Review title preview");
  const previewDescription = metaDescription || subtitle;
  const sharingImage = availableMedia.find((item) => item.id === (openGraphMediaId || featuredMediaId));
  const expiringSession = useRef(false);
  const recoveryKey = recoveryUserId ? `cms-review-recovery:${recoveryUserId}:${article?.id ?? "new"}` : null;
  const [recovery, setRecovery] = useState<ArticleDraftValues | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);

  useEffect(() => {
    if (!recoveryKey) return;
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(recoveryKey);
        if (stored) {
          const values: unknown = JSON.parse(stored);
          if (typeof values !== "object" || values === null || !("title" in values) || !("slug" in values)
            || typeof values.title !== "string" || typeof values.slug !== "string") {
            throw new Error("Stored recovery draft is invalid.");
          }
          const parsed = articleDraftSchema.safeParse({ ...values, title: "Recovery draft", slug: "recovery-draft" });
          if (!parsed.success) throw new Error("Stored recovery draft is invalid.");
          setRecovery({ ...parsed.data, title: values.title, slug: values.slug });
        }
      } catch (error) {
        setSaveMessage(`Recovery unavailable: ${error instanceof Error ? error.message : "Browser storage failed."}`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [recoveryKey]);

  useEffect(() => {
    if (!recoveryKey) return;
    const preserve = (event: Event) => {
      try {
        if (form.formState.isDirty || saveRef.current) sessionStorage.setItem(recoveryKey, JSON.stringify(form.getValues()));
        expiringSession.current = true;
      } catch (error) {
        event.preventDefault();
        setSaveMessage(`Could not preserve review before logout: ${error instanceof Error ? error.message : "Browser storage failed."}`);
      }
    };
    window.addEventListener("cms-session-expiring", preserve);
    return () => window.removeEventListener("cms-session-expiring", preserve);
  }, [recoveryKey, form, form.formState.isDirty]);

  useEffect(() => {
    if (article && !form.formState.isDirty) {
      form.setValue("expectedUpdatedAt", article.updated_at, { shouldDirty: false });
    }
  }, [article, form]);

  const showValidation = useCallback((values: ArticleDraftValues, reveal: boolean) => {
    const validation = articleDraftSchema.safeParse(values);
    if (validation.success) return;
    const issue = validation.error.issues[0];
    const field = validationField(issue.path.join("."));
    setSaveMessage(`Not saved — ${field.label}: ${issue.message}`);
    if (reveal) {
      setTab(field.tab);
      window.setTimeout(() => form.setFocus(issue.path.join(".") as Parameters<typeof form.setFocus>[0]), 0);
    }
  }, [form]);

  const persist = useCallback(async (showErrors = false): Promise<CmsActionResult | null> => {
    if (savePromiseRef.current) {
      const result = await savePromiseRef.current;
      if (!result?.ok && showErrors) showValidation(form.getValues(), true);
      return result;
    }
    saveRef.current = true;
    const task = (async (): Promise<CmsActionResult | null> => {
      // Keep one save in flight and drain changes made while the request runs.
      while (true) {
        const snapshot = structuredClone(form.getValues());
        if (!await form.trigger()) {
          showValidation(snapshot, showErrors);
          return null;
        }
        setSaveMessage("Saving…");
        let result: CmsActionResult;
        try {
          result = await saveArticle(snapshot);
        } catch (error) {
          setSaveMessage(error instanceof Error ? `Save failed: ${error.message}` : "Save failed. Retry your changes.");
          return null;
        }
        if (!result.ok || !result.id || !result.updatedAt) {
          setSaveMessage(result.message);
          return null;
        }
        form.setValue("id", result.id, { shouldDirty: false });
        form.setValue("expectedUpdatedAt", result.updatedAt, { shouldDirty: false });
        const current = form.getValues();
        const changedDuringSave = JSON.stringify({ ...current, id: undefined, expectedUpdatedAt: undefined }) !== JSON.stringify({ ...snapshot, id: undefined, expectedUpdatedAt: undefined });
        if (changedDuringSave) {
          setSaveMessage("Saving newer changes…");
          continue;
        }
        form.reset({ ...snapshot, id: result.id, expectedUpdatedAt: result.updatedAt });
        if (recoveryKey) {
          try { sessionStorage.removeItem(recoveryKey); } catch (error) {
            setSaveMessage(`Review saved, but recovery cleanup failed: ${error instanceof Error ? error.message : "Browser storage failed."}`);
            return result;
          }
        }
        setSaveMessage("All changes saved");
        if (!changingStatusRef.current && !article && window.location.pathname.endsWith("/new")) {
          router.replace(`/admin/reviews/${result.id}?tab=${tab}`);
        }
        return result;
      }
    })();
    savePromiseRef.current = task;
    try { return await task; }
    finally {
      saveRef.current = false;
      savePromiseRef.current = null;
    }
  }, [article, form, router, recoveryKey, showValidation, tab]);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    let timeout = 0;
    timeout = window.setTimeout(() => { if (!changingStatusRef.current) void persistRef.current(); }, 1600);
    return () => window.clearTimeout(timeout);
  }, [form.formState.isDirty, watchedValues]);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (expiringSession.current) return;
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

  const publish = (targetStatus: "in_review" | "approved" | "published" | "draft" | "archived" | "scheduled") => {
    if (changingStatusRef.current) return;
    changingStatusRef.current = true;
    setTransitionMessage("");
    startTransition(async () => {
      try {
        const saved = await persistRef.current(true);
        if (!saved?.ok || !saved.id) {
          setTransitionMessage("The review must save successfully before its status can change. Check the save message and highlighted fields.");
          return;
        }
        const result = await transitionArticle({ articleId: saved.id, targetStatus, scheduledLocal });
        setTransitionMessage(result.message);
        if (result.ok) {
          if (!article) router.replace(`/admin/reviews/${saved.id}?tab=publishing`);
          else router.refresh();
        }
      } catch (error) {
        setTransitionMessage(error instanceof Error ? error.message : "Could not change publication status. Please retry.");
      } finally { changingStatusRef.current = false; }
    });
  };

  return <>
    {recovery && <section className="cms-alert" role="alert">
      <p>Unsaved review edits from an expired session are available in this tab. Restore them only if you want to replace the current editor contents; your saved review is unchanged until you save.</p>
      <button className="cms-secondary-button" type="button" onClick={() => {
        form.reset({ ...recovery, id: article?.id, expectedUpdatedAt: article?.updated_at }, { keepDefaultValues: true });
        setEditorVersion((current) => current + 1);
        setRecovery(null);
      }}>Restore unsaved review</button>
      <button className="cms-secondary-button" type="button" onClick={() => {
        try {
          if (recoveryKey) sessionStorage.removeItem(recoveryKey);
          setRecovery(null);
        } catch (error) { setSaveMessage(`Could not discard recovery: ${error instanceof Error ? error.message : "Browser storage failed."}`); }
      }}>Discard recovery</button>
    </section>}
    <div className="cms-page-heading"><div><span className="cms-overline">REVIEW WORKSPACE · {status.replace("_", " ").toUpperCase()}</span><h1>{article ? "Edit review" : "New review"}</h1><p>The story, the experience, and your verdict belong together. Save before opening linked place or visit records.</p></div><div className="cms-heading-actions"><Link className="cms-secondary-button" href="/admin/reviews">Back to reviews</Link>{article && <Link className="cms-secondary-button" href={`/admin/reviews/${article.id}/preview`}>Private preview</Link>}{article && role !== "contributor" && <Link className="cms-secondary-button" href={`/admin/visits/new?review=${article.id}`}>Record this visit</Link>}{article && (role === "owner" || role === "editor") && <DeleteArticleButton id={article.id} />}</div></div>
    {visits.length > 0 && <section className="cms-panel cms-panel-body" aria-label="Visits for this review"><h2>Visits and receipts</h2>{visits.map((visit) => <p key={visit.id}><Link href={`/admin/visits/${visit.id}/edit`}>Edit visit from {visit.visited_at}</Link></p>)}</section>}
    <div className="cms-editor-layout">
      <section className="cms-panel">
        <nav className="cms-tabs" role="tablist" aria-label="Review editor sections">
          {editorTabs.map(({ id, label }, index) => <button key={id} disabled={isTransitioning} id={`${editorId}-tab-${id}`} aria-controls={`${editorId}-panel`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={(event) => {
            const next = event.key === "ArrowRight" ? (index + 1) % editorTabs.length
              : event.key === "ArrowLeft" ? (index + editorTabs.length - 1) % editorTabs.length
              : event.key === "Home" ? 0 : event.key === "End" ? editorTabs.length - 1 : null;
            if (next === null) return;
            event.preventDefault();
            setTab(editorTabs[next].id);
            document.getElementById(`${editorId}-tab-${editorTabs[next].id}`)?.focus();
          }} role="tab" type="button">{label}</button>)}
        </nav>
        <form noValidate onSubmit={(event) => { event.preventDefault(); void persistRef.current(true); }}>
          <fieldset className="cms-editor-fields" disabled={isTransitioning}>
          <div id={`${editorId}-panel`} role="tabpanel" aria-labelledby={`${editorId}-tab-${tab}`}>
          {tab === "content" && <>
            <section className="cms-review-section"><h2>The basics</h2><p className="cms-muted">Every review follows the same format: title and score, quick verdict, cover photo, visit details, full review, additional photos, and more reviews. Identify the exact branch or location. Drafts can stay unlinked; publishing requires a matching place.</p>
            <div className="cms-form-grid">
              <InputField error={form.formState.errors.title?.message} label="Headline" help="Keep the visible headline concise. Use the SEO tab for a longer search title." {...form.register("title")} />
              <InputField error={form.formState.errors.slug?.message} label="URL slug" {...form.register("slug")} />
              <InputField className="cms-form-span" error={form.formState.errors.subtitle?.message} label="Subtitle / dek" {...form.register("subtitle")} />
              <label className="cms-field"><span className="cms-label">Review type</span><select aria-disabled={creatingPlace} inert={creatingPlace} {...form.register("reviewType", { onChange: () => form.setValue("restaurantId", "", { shouldDirty: true }) })}><option value="restaurant">Restaurant</option><option value="activity">Activity</option></select></label>
              {role !== "contributor" && <>
                <label className="cms-field"><span className="cms-label">Find an existing place</span><input value={placeSearch} onChange={(event) => setPlaceSearch(event.target.value)} placeholder="Search place names" /></label>
                <label className="cms-field"><span className="cms-label">Place reviewed</span><select {...form.register("restaurantId")}><option value="">Not linked yet</option>{availablePlaces.filter((place) => place.place_type === reviewType && (place.id === selectedPlaceId || place.name.toLowerCase().includes(placeSearch.toLowerCase()))).map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
                <InlinePlace key={reviewType} reviewType={reviewType} onBusyChange={setCreatingPlace} onCreated={(place) => {
                  setCreatedPlaces((current) => [...current, place]);
                  setPlaceSearch("");
                  form.setValue("restaurantId", place.id, { shouldDirty: true, shouldValidate: true });
                }} />
                {selectedPlaceId && <div className="cms-field"><Link href={`/admin/places/${selectedPlaceId}/edit`}>Edit linked place details (save review first)</Link></div>}
                <label className="cms-field"><span className="cms-label">Neighborhood</span><select {...form.register("neighborhoodId")}><option value="">No neighborhood</option>{neighborhoods.map((neighborhood) => <option key={neighborhood.id} value={neighborhood.id}>{neighborhood.name}</option>)}</select></label>
                <label className="cms-checkbox-field cms-form-span"><input type="checkbox" {...form.register("isSponsored")} /> Mark as sponsored content and show the public disclosure label</label>
              </>}
              <InputField className="cms-form-span" error={form.formState.errors.tags?.message} label="Tags (comma-separated)" {...form.register("tags")} />
              <InputField label="Visit date (public, optional)" type="date" error={form.formState.errors.reviewTemplate?.visitedAt?.message} {...form.register("reviewTemplate.visitedAt")} />
              <InputField label="Price / budget" maxLength={120} placeholder="e.g. $4.25 per taco, at our visit" help="Include the unit and what is covered. Use a verified price from your visit." {...form.register("reviewTemplate.priceRange")} />
              <InputField className="cms-form-span" label="Best for" maxLength={240} placeholder="e.g. A relaxed date night" {...form.register("reviewTemplate.bestFor")} />
            </div>
            </section>
            <section className="cms-review-section"><h2>Our experience</h2><p className="cms-muted">Start with the story: the people, the room, and what the visit felt like. Use your own voice. Insert your photos between paragraphs using the media picker.</p>
              <ReviewRichText key={`body-${editorVersion}`} label="Article body" content={form.getValues("content")} media={availableMedia} onChange={(content) => form.setValue("content", content, { shouldDirty: true, shouldValidate: true })} />
            </section>
            {reviewSections.map(({ field, title: label }) => <section className="cms-review-section" key={field}><h2>{label}</h2><p className="cms-muted">{field === "tried"
              ? reviewType === "activity" ? "Describe the activities, tickets, or experiences and what they cost." : "Describe the dishes and drinks, prices, and what you thought."
              : field === "worthKnowing" ? "Give practical advice: timing, reservations, parking, waits, and drawbacks."
                : "Start with a clear yes or no and why. Then say who you would recommend it to."} The section heading is added automatically; start with your answer. Leave blank to hide this section.</p>
              <ReviewRichText key={`${field}-${editorVersion}`} label={label} content={form.getValues(`reviewTemplate.${field}`) ?? blankDocument} media={availableMedia} onChange={(content) => form.setValue(`reviewTemplate.${field}`, content, { shouldDirty: true, shouldValidate: true })} />
            </section>)}
            <section className="cms-review-section"><h2>Your verdict and score</h2><p className="cms-muted">The quick verdict appears beside the score, above the cover photo. Write one or two sentences, ideally under 280 characters; put the supporting story in Our experience. Longer saved verdicts remain available behind “Read the full takeaway.” The optional score is your opinion, not a customer average.</p>
              <label className="cms-field"><span className="cms-label">Quick verdict</span><textarea maxLength={1500} placeholder="Worth visiting? Say why in one or two sentences." {...form.register("reviewTemplate.quickVerdict")} /></label>
              <InputField label="Overall score (0–10, optional)" type="number" min={0} max={10} step={0.1} error={form.formState.errors.overallScore?.message} {...form.register("overallScore", { setValueAs: (value: string | number) => value === "" ? "" : Number(value) })} />
            </section>
            <section className="cms-review-section"><h2>Photography</h2><p className="cms-muted">Build the photo story in the Photos tab: upload, caption, reorder, and choose a cover without leaving this review.</p>
              <label className="cms-field"><span className="cms-label">Featured image</span><select {...form.register("featuredMediaId")}><option value="">No featured image</option>{availableMedia.map((item) => <option key={item.id} value={item.id}>{item.altText || item.caption || item.id}</option>)}</select></label>
              <button className="cms-secondary-button" type="button" onClick={() => setTab("photos")}>Manage review photos</button>
            </section>
          </>}
          {tab === "photos" && <ReviewPhotos media={availableMedia} photos={template.gallery} featuredMediaId={featuredMediaId}
            onCoverChange={(id) => form.setValue("featuredMediaId", id, { shouldDirty: true })}
            onChange={(photos) => form.setValue("reviewTemplate.gallery", photos, { shouldDirty: true, shouldValidate: true })} />}
          {tab === "seo" && <section className="cms-review-section">
            <h2>Search and social sharing</h2>
            <p className="cms-muted">Control how this review is described in search results and link previews. These fields do not publish the review.</p>
            <div className="cms-form-grid">
              <InputField className="cms-form-span" label="SEO title" maxLength={70} placeholder={title ? `${title} | ${SITE_NAME}` : "Uses your headline when left blank"} help={`${seoTitle.length}/70 characters. Leave blank to use the headline and site name.`} error={form.formState.errors.seoTitle?.message} {...form.register("seoTitle")} />
              <label className="cms-field cms-form-span"><span className="cms-label">Meta description</span><textarea aria-label="Meta description" maxLength={180} placeholder="A concise, honest summary of what readers will learn." {...form.register("metaDescription")} /><small>{metaDescription.length}/180 characters. Leave blank to use the subtitle.</small>{form.formState.errors.metaDescription && <small className="cms-form-error">{form.formState.errors.metaDescription.message}</small>}</label>
              <div className="cms-form-span cms-seo-preview" aria-label="Search result preview"><small>SEARCH RESULT PREVIEW</small><b>{previewTitle}</b><span className="cms-seo-url">{previewUrl}</span><p>{previewDescription || "Add a description or subtitle to preview the search summary."}</p><small>Search engines may display a different title or summary.</small></div>
              <label className="cms-field cms-form-span"><span className="cms-label">Social sharing image</span><select aria-label="Social sharing image" {...form.register("openGraphMediaId")}><option value="">Use featured image</option>{availableMedia.map((item) => <option key={item.id} value={item.id}>{item.altText || item.caption || item.id}</option>)}</select><small>Uses the featured image when no separate social image is selected.</small></label>
              {sharingImage && <div className="cms-social-preview cms-form-span"><Image src={sharingImage.url} alt={sharingImage.altText || "Selected social sharing image"} width={160} height={84} unoptimized /><span>{sharingImage.altText || sharingImage.caption || "Selected sharing image"}</span></div>}
              <InputField label="Primary keyword" maxLength={100} help="Your main topic for editorial planning." error={form.formState.errors.primaryKeyword?.message} {...form.register("primaryKeyword")} />
              <InputField label="Secondary keywords (comma-separated)" maxLength={500} help="Related topics for editorial planning." error={form.formState.errors.secondaryKeywords?.message} {...form.register("secondaryKeywords")} />
              <label className="cms-field cms-form-span"><span className="cms-label">Internal linking notes</span><textarea aria-label="Internal linking notes" maxLength={5000} {...form.register("internalLinkingNotes")} /><small>Private reminders. Add the actual links in your review text.</small></label>
              <div className="cms-form-span"><label className="cms-checkbox-field"><input type="checkbox" {...form.register("indexingEnabled")} /> Allow search engines to index this article once published</label><p className="cms-muted">{indexingEnabled ? "Once published, this review can appear in search and site listings. Search engines decide when to index it." : "Once published, this review will be marked noindex and excluded from the sitemap and public review listings. Its direct URL will still be public."} Drafts and private previews remain private.</p></div>
            </div>
          </section>}
          {tab === "publishing" && <div className="cms-review-section">
            <h2>Review and publication</h2>
            <p className="cms-muted">Save your review, submit it for review, then approve it before publishing. Each action saves your latest edits first.</p>
            <div className="cms-alert">Review status: <b>{status.replace("_", " ")}</b>.</div>
            {canPublish && !selectedPlaceId && <p className="cms-alert">Before publishing or scheduling, choose a matching place in Content. You can save and submit an unlinked draft.</p>}
            <label className="cms-checkbox-field"><input type="checkbox" {...form.register("indexingEnabled")} /> Allow search engines to index this article once published</label>
            <p className="cms-muted">{indexingEnabled ? "After publication, this review is eligible for search and included in site listings and the sitemap. Google decides when to index it." : "After publication, this review is marked noindex and excluded from site listings and the sitemap. Its direct URL stays public."} Save changes to apply this setting.</p>
            {status === "published" && <p className="cms-alert">Saving changes updates the live review immediately.</p>}
            {status === "scheduled" && article?.scheduled_at && <p>Scheduled for {new Date(article.scheduled_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium", timeStyle: "short" })} (Las Vegas time).</p>}
            {canPublish && (status === "approved" || status === "scheduled") && <>
              <label className="cms-field"><span className="cms-label">Schedule for (Las Vegas time)</span><input aria-describedby="schedule-help" disabled={!schedulingConfigured} onChange={(event) => setScheduledLocal(event.target.value)} type="datetime-local" value={scheduledLocal} /></label>
              <p className="cms-muted" id="schedule-help">{schedulingConfigured ? "All dates use Las Vegas time, regardless of your device time zone. Scheduled reviews publish on the first hourly publishing run after the selected time, which can be up to an hour later." : "Automatic publishing is unavailable in this environment. Configure CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY in the hosting environment, then redeploy with the hourly publishing job enabled. You can still use Publish now for an approved review."}</p>
            </>}
            <div className="cms-heading-actions">
              {status === "draft" && <button className="cms-secondary-button" onClick={() => publish("in_review")} type="button">Submit for review</button>}
              {canPublish && status === "in_review" && <button className="cms-secondary-button" onClick={() => publish("approved")} type="button">Approve for publication</button>}
              {canPublish && status === "approved" && <button className="cms-primary-button" onClick={() => publish("published")} type="button">Publish now</button>}
              {canPublish && (status === "approved" || status === "scheduled") && <button className="cms-secondary-button" disabled={!schedulingConfigured || !scheduledLocal} onClick={() => publish("scheduled")} type="button">Schedule</button>}
              {canPublish && status === "published" && <button className="cms-secondary-button" onClick={() => publish("draft")} type="button">Unpublish</button>}
              {canPublish && ["in_review", "approved", "scheduled", "archived"].includes(status) && <button className="cms-secondary-button" onClick={() => publish("draft")} type="button">{status === "scheduled" ? "Cancel schedule and return to draft" : "Return to draft"}</button>}
              {canPublish && ["draft", "in_review", "approved", "published"].includes(status) && <button className="cms-secondary-button" onClick={() => publish("archived")} type="button">Archive</button>}
            </div>
            {transitionMessage && <p className="cms-alert" role="status">{transitionMessage}</p>}
            {!canPublish && <p className="cms-muted">You can submit your draft for review. An editor or owner approves and publishes it.</p>}
          </div>}
          </div>
          <div className="cms-save-row"><span className="cms-save-state" data-state={saveMessage === "All changes saved" ? "saved" : "pending"} role="status">{form.formState.isDirty && ["All changes saved", "New draft"].includes(saveMessage) ? "Unsaved changes" : saveMessage}</span><button className="cms-primary-button" disabled={isTransitioning || saveMessage === "Saving…"} type="submit">{isTransitioning ? "Changing status…" : saveMessage === "Saving…" ? "Saving…" : status === "draft" ? "Save draft" : "Save changes"}</button></div>
          </fieldset>
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

function InputField({ label, className = "", error, help, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; help?: string }) {
  const id = useId();
  return <label className={`cms-field ${className}`}><span className="cms-label">{label}</span><input {...props} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error || help ? `${id}-help` : undefined} />{(error || help) && <small id={`${id}-help`} className={error ? "cms-form-error" : undefined}>{error || help}</small>}</label>;
}
