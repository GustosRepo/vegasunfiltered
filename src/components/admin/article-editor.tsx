"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InputHTMLAttributes } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { articleDraftSchema, type EditorNode } from "@/lib/cms-schemas";
import { saveArticle, transitionArticle } from "@/app/actions/articles";
import type { CmsRole } from "@/lib/admin-auth";
import { DeleteArticleButton } from "@/components/admin/destructive-action";

type Category = { id: string; name: string; slug: string };
type MediaOption = { id: string; url: string; altText: string; caption: string };
type ArticleDraftValues = z.infer<typeof articleDraftSchema>;
type ArticleSeo = {
  seo_title?: string | null; meta_description?: string | null; canonical_url?: string | null;
  primary_keyword?: string | null; secondary_keywords?: string[] | null;
  internal_linking_notes?: string | null; indexing_enabled?: boolean | null;
};
type Article = {
  id: string; title: string; subtitle: string; slug: string; kind: ArticleDraftValues["kind"];
  category_id: string | null; content: EditorNode; status: string; updated_at: string;
  tags: string; seo?: ArticleSeo | ArticleSeo[] | null;
};

const blankDocument: EditorNode = { type: "doc", content: [{ type: "paragraph" }] };
type Tab = "content" | "seo" | "publishing";

export function ArticleEditor({ article, categories, media, role }: { article?: Article; categories: Category[]; media: MediaOption[]; role: CmsRole }) {
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
      kind: article?.kind ?? "editorial_story",
      categoryId: article?.category_id ?? "",
      tags: article?.tags ?? "",
      seoTitle: initialSeo?.seo_title ?? "",
      metaDescription: initialSeo?.meta_description ?? "",
      canonicalUrl: initialSeo?.canonical_url ?? "",
      primaryKeyword: initialSeo?.primary_keyword ?? "",
      secondaryKeywords: initialSeo?.secondary_keywords?.join(", ") ?? "",
      internalLinkingNotes: initialSeo?.internal_linking_notes ?? "",
      indexingEnabled: initialSeo?.indexing_enabled ?? false,
      content: article?.content ?? blankDocument,
    },
    mode: "onChange",
  });
  const [tab, setTab] = useState<Tab>("content");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [saveMessage, setSaveMessage] = useState(article ? "All changes saved" : "New draft");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [isTransitioning, startTransition] = useTransition();
  const saveRef = useRef(false);
  const queuedRef = useRef(false);
  const persistRef = useRef<() => Promise<void>>(async () => {});
  const watchedValues = useWatch({ control: form.control });
  const title = useWatch({ control: form.control, name: "title" });
  const slug = useWatch({ control: form.control, name: "slug" });
  const seoTitle = useWatch({ control: form.control, name: "seoTitle" });
  const metaDescription = useWatch({ control: form.control, name: "metaDescription" });
  const status = article?.status ?? "draft";
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
      Image.configure({ allowBase64: false }),
      LinkExtension.configure({ openOnClick: false, protocols: ["https", "http"] }),
      Youtube.configure({ nocookie: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: article?.content ?? blankDocument,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      form.setValue("content", current.getJSON() as EditorNode, { shouldDirty: true, shouldValidate: true });
    },
    editorProps: { attributes: { class: "cms-rich-editor", "aria-label": "Article body" } },
  });

  const persist = useCallback(async () => {
    if (saveRef.current) {
      queuedRef.current = true;
      return;
    }
    const snapshot = form.getValues();
    const valid = await form.trigger();
    if (!valid) {
      setSaveMessage("Complete required fields to save");
      return;
    }
    saveRef.current = true;
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
    const changedDuringSave = JSON.stringify({ ...current, expectedUpdatedAt: undefined }) !== JSON.stringify({ ...snapshot, expectedUpdatedAt: undefined });
    if (!changedDuringSave) {
      form.reset({ ...snapshot, id: result.id, expectedUpdatedAt: result.updatedAt });
    }
    setSaveMessage("All changes saved");
    if (!article && typeof window !== "undefined" && window.location.pathname.endsWith("/new")) {
      router.replace(`/admin/articles/${result.id}`);
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
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [form.formState.isDirty]);

  const publish = (targetStatus: "in_review" | "approved" | "published" | "draft" | "archived") => {
    void form.handleSubmit(async (values) => {
      const saved = await saveArticle(values);
      if (!saved.ok || !saved.id) {
        setTransitionMessage(saved.message);
        return;
      }
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
      if (!saved.ok || !saved.id) {
        setTransitionMessage(saved.message);
        return;
      }
      startTransition(async () => {
        const result = await transitionArticle({ articleId: saved.id, targetStatus: "scheduled", scheduledLocal });
        setTransitionMessage(result.message);
        if (result.ok) router.refresh();
      });
    })();
  };

  return <>
    <div className="cms-page-heading"><div><span className="cms-overline">ARTICLE WORKSPACE · {status.replace("_", " ").toUpperCase()}</span><h1>{article ? "Edit article" : "New article"}</h1><p>Save drafts as you work. Publishing remains an explicit editorial action.</p></div><div className="cms-heading-actions"><Link className="cms-secondary-button" href="/admin/articles">Back to articles</Link>{article && (role === "owner" || role === "editor") && <DeleteArticleButton id={article.id} />}</div></div>
    <div className="cms-editor-layout">
      <section className="cms-panel">
        <nav className="cms-tabs" aria-label="Article editor sections">
          {(["content", "seo", "publishing"] as const).map((value) => <button key={value} aria-selected={tab === value} onClick={() => setTab(value)} role="tab" type="button">{value[0].toUpperCase() + value.slice(1)}</button>)}
        </nav>
        <form onSubmit={(event) => { event.preventDefault(); void persistRef.current(); }}>
          {tab === "content" && <>
            <div className="cms-form-grid">
              <InputField error={form.formState.errors.title?.message} label="Headline" {...form.register("title")} />
              <InputField error={form.formState.errors.slug?.message} label="URL slug" {...form.register("slug")} />
              <InputField className="cms-form-span" error={form.formState.errors.subtitle?.message} label="Subtitle / dek" {...form.register("subtitle")} />
              <label className="cms-field"><span className="cms-label">Article type</span><select {...form.register("kind")}><option value="editorial_story">Editorial story</option><option value="restaurant_review">Restaurant review</option><option value="seo_guide">SEO guide</option><option value="neighborhood_guide">Neighborhood guide</option><option value="experience_review">Experience review</option></select></label>
              <label className="cms-field"><span className="cms-label">Category</span><select {...form.register("categoryId")}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <InputField className="cms-form-span" error={form.formState.errors.tags?.message} label="Tags (comma-separated)" {...form.register("tags")} />
            </div>
            <div className="cms-editor-shell">
              <EditorToolbar editor={editor} media={media} />
              <EditorContent editor={editor} />
            </div>
            <p className="cms-muted">Use the toolbar for headings, lists, quotations, links, images, and tables. Draft media embeds must use secure URLs.</p>
          </>}
          {tab === "seo" && <div className="cms-form-grid">
            <InputField className="cms-form-span" label="SEO title" maxLength={70} {...form.register("seoTitle")} />
            <InputField className="cms-form-span" label="Meta description" maxLength={180} {...form.register("metaDescription")} />
            <InputField className="cms-form-span" label="Canonical URL (HTTPS)" {...form.register("canonicalUrl")} />
            <InputField label="Primary keyword" {...form.register("primaryKeyword")} />
            <InputField label="Secondary keywords (comma-separated)" {...form.register("secondaryKeywords")} />
            <label className="cms-field cms-form-span"><span className="cms-label">Internal linking notes</span><textarea {...form.register("internalLinkingNotes")} /></label>
            <label className="cms-checkbox-field cms-form-span"><input type="checkbox" {...form.register("indexingEnabled")} /> Allow search engines to index this article once published</label>
            <div className="cms-form-span cms-seo-preview"><b>{seoTitle || title || "Article title preview"}</b><a href="#">{`https://vegasunfiltered.com/${slug || "article-slug"}`}</a><p>{metaDescription || "Add a concise description to preview how this story may appear in search results."}</p></div>
          </div>}
          {tab === "publishing" && <div className="cms-panel-body">
            <div className="cms-alert"><span>Article status: <b>{status.replace("_", " ")}</b>. Scheduled articles require an external scheduler; scheduled publication is not automatic.</span></div>
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
          <div className="cms-save-row"><span className="cms-save-state" data-state={saveMessage === "All changes saved" ? "saved" : "pending"} role="status">{form.formState.isDirty && saveMessage !== "Saving…" ? "Unsaved changes" : saveMessage}</span><button className="cms-primary-button" disabled={isTransitioning || saveMessage === "Saving…"} type="submit">{isTransitioning ? "Changing status…" : saveMessage === "Saving…" ? "Saving…" : "Save draft"}</button></div>
        </form>
      </section>
    </div>
  </>;
}

function InputField({ label, className = "", error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return <label className={`cms-field ${className}`}><span className="cms-label">{label}</span><input {...props} />{error && <small className="cms-form-error">{error}</small>}</label>;
}

function EditorToolbar({ editor, media }: { editor: Editor | null; media: MediaOption[] }) {
  if (!editor) return <div className="cms-editor-toolbar" aria-label="Loading text editor">Loading editor…</div>;
  const buttons = [
    ["Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold")],
    ["Italic", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic")],
    ["Heading 2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 })],
    ["Heading 3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 })],
    ["Bulleted list", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList")],
    ["Numbered list", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList")],
    ["Blockquote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote")],
    ["Undo", () => editor.chain().focus().undo().run(), false],
    ["Redo", () => editor.chain().focus().redo().run(), false],
  ] as const;
  return <div className="cms-editor-toolbar" role="toolbar" aria-label="Text formatting">
    {buttons.map(([label, run, active]) => <button aria-label={label} aria-pressed={active} className={active ? "is-active" : ""} key={label} onClick={run} title={label} type="button">{label}</button>)}
    <button onClick={() => { const url = window.prompt("Enter an HTTPS image URL"); if (url?.startsWith("https://")) editor.chain().focus().setImage({ src: url }).run(); }} type="button">Image</button>
    {media.length > 0 && <label className="cms-media-picker"><span className="cms-sr-only">Insert image from media library</span><select defaultValue="" onChange={(event) => {
      const image = media.find((item) => item.id === event.target.value);
      if (image) editor.chain().focus().setImage({ src: image.url, alt: image.altText, title: image.caption }).run();
      event.target.value = "";
    }}><option value="">Media library</option>{media.map((item) => <option key={item.id} value={item.id}>{item.altText || item.caption || item.id}</option>)}</select></label>}
    <button onClick={() => { const url = window.prompt("Enter an HTTPS link URL"); if (url?.startsWith("https://")) editor.chain().focus().setLink({ href: url, rel: "noopener noreferrer" }).run(); }} type="button">Link</button>
    <button onClick={() => { const url = window.prompt("Enter a YouTube video URL"); if (url?.startsWith("https://")) editor.commands.setYoutubeVideo({ src: url }); }} type="button">YouTube</button>
    <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} type="button">Table</button>
    <button onClick={() => editor.chain().focus().setHorizontalRule().run()} type="button">Divider</button>
  </div>;
}
