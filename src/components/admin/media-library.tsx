"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { updateMediaMetadata } from "@/app/actions/media";
import { FormWithFeedback } from "@/components/admin/form-feedback";
import { DeleteMediaButton } from "@/components/admin/destructive-action";

export type MediaLibraryItem = {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  alt_text: string;
  caption: string;
  photographer_credit: string;
  storage_path: string;
};

export function MediaLibrary({ items, publicMediaUrl }: { items: MediaLibraryItem[]; publicMediaUrl: (path: string) => string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = useMemo(() => items.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesText = !term || [item.file_name, item.alt_text, item.caption, item.photographer_credit]
      .some((value) => value.toLowerCase().includes(term));
    return matchesText && (filter !== "missing-alt" || !item.alt_text.trim()) &&
      (filter !== "image-type" || item.mime_type.startsWith("image/"));
  }), [items, search, filter]);
  return <section className="cms-panel">
    <div className="cms-panel-header"><h2>Editorial images</h2><p>{visible.length} shown · {items.length} recent uploads</p></div>
    <div className="cms-panel-body"><div className="cms-toolbar">
      <label><span className="cms-sr-only">Search media</span><input onChange={(event) => setSearch(event.target.value)} placeholder="Search files, captions, credits" value={search} /></label>
      <label><span className="cms-sr-only">Filter media</span><select onChange={(event) => setFilter(event.target.value)} value={filter}><option value="all">All images</option><option value="missing-alt">Missing alt text</option><option value="image-type">Images</option></select></label>
    </div></div>
    {visible.length ? <div className="cms-media-grid">{visible.map((media) => <article className="cms-media-card" key={media.id}>
      <Image alt={media.alt_text || ""} height={300} src={publicMediaUrl(media.storage_path)} unoptimized width={400} />
      <FormWithFeedback action={updateMediaMetadata} className="cms-panel-body cms-media-form">
        <input name="id" type="hidden" value={media.id} />
        <label className="cms-field"><span className="cms-label">Alt text</span><input defaultValue={media.alt_text} name="altText" /></label>
        <label className="cms-field"><span className="cms-label">Caption</span><textarea defaultValue={media.caption} name="caption" /></label>
        <label className="cms-field"><span className="cms-label">Credit</span><input defaultValue={media.photographer_credit} name="photographerCredit" /></label>
        <p className="cms-muted">{media.file_name} · {(media.file_size / 1024 / 1024).toFixed(1)} MB</p>
      </FormWithFeedback>
      <DeleteMediaButton id={media.id} />
    </article>)}</div> : <div className="cms-empty">No media matches these filters.</div>}
  </section>;
}
