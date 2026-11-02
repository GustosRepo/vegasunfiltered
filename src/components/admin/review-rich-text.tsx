"use client";

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
import type { EditorNode } from "@/lib/cms-schemas";

export type ReviewMediaOption = { id: string; url: string; altText: string; caption: string; credit?: string };

export function ReviewRichText({ label, content, media, onChange }: {
  label: string; content: EditorNode; media: ReviewMediaOption[]; onChange: (content: EditorNode) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }),
      Image.configure({ allowBase64: false }),
      LinkExtension.configure({ openOnClick: false, protocols: ["https", "http"] }),
      Youtube.configure({ nocookie: true }),
      Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
    ],
    content: { type: "doc", content: content.content },
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as EditorNode),
    editorProps: { attributes: { class: "cms-rich-editor", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
  });
  return <div className="cms-editor-shell">
    <EditorToolbar editor={editor} media={media} />
    <EditorContent editor={editor} />
  </div>;
}

function EditorToolbar({ editor, media }: { editor: Editor | null; media: ReviewMediaOption[] }) {
  if (!editor) return <div className="cms-editor-toolbar" aria-label="Loading text editor">Loading editor...</div>;
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
