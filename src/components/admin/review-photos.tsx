"use client";

import Image from "next/image";
import { useState } from "react";
import type { ReviewPhoto } from "@/lib/cms-schemas";
import type { ReviewMediaOption } from "@/components/admin/review-rich-text";

export function ReviewPhotos({ media, photos, featuredMediaId, onCoverChange, onChange }: {
  media: ReviewMediaOption[]; photos: ReviewPhoto[]; featuredMediaId: string;
  onCoverChange: (id: string) => void; onChange: (photos: ReviewPhoto[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const cover = media.find((image) => image.id === featuredMediaId);
  const available = media.filter((image) => !photos.some((photo) => photo.mediaId === image.id)
    && [image.altText, image.caption, image.id].some((value) => value.toLowerCase().includes(search.toLowerCase())));
  function update(index: number, patch: Partial<ReviewPhoto>) {
    onChange(photos.map((photo, position) => position === index ? { ...photo, ...patch } : photo));
  }
  function move(index: number, direction: -1 | 1) {
    const reordered = [...photos];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    onChange(reordered);
  }
  return <div className="cms-review-section">
    <h2>Cover photo</h2>
    <label className="cms-field"><span className="cms-label">Review cover image</span><select value={featuredMediaId} onChange={(event) => onCoverChange(event.target.value)}>
      <option value="">No featured image</option>{media.map((image) => <option key={image.id} value={image.id}>{image.altText || image.caption || image.id}</option>)}
    </select></label>
    {cover && <Image className="cms-review-cover" src={cover.url} alt={cover.altText} width={640} height={360} unoptimized />}
    <h2>Photo gallery</h2>
    <p className="cms-muted">Up to 50 photos, in the order readers will see them. Captions, alt text, and credits here apply only to this review.</p>
    {photos.length === 0 && <p className="cms-muted">No gallery photos yet. Add from the library below or upload a new photo.</p>}
    <ol className="cms-review-photo-list">{photos.map((photo, index) => <li key={photo.mediaId} className="cms-review-photo">
      <Image src={photo.url} alt={photo.altText} width={320} height={240} unoptimized />
      <div>
        <label className="cms-field"><span className="cms-label">Photo {index + 1} alt text</span><input required maxLength={500} value={photo.altText} onChange={(event) => update(index, { altText: event.target.value })} /></label>
        <label className="cms-field"><span className="cms-label">Photo {index + 1} caption</span><textarea maxLength={2000} value={photo.caption} onChange={(event) => update(index, { caption: event.target.value })} /></label>
        <label className="cms-field"><span className="cms-label">Photo {index + 1} credit</span><input maxLength={200} value={photo.credit} onChange={(event) => update(index, { credit: event.target.value })} /></label>
        <div className="cms-heading-actions">
          <button className="cms-secondary-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move photo ${index + 1} earlier`}>Move up</button>
          <button className="cms-secondary-button" type="button" disabled={index === photos.length - 1} onClick={() => move(index, 1)} aria-label={`Move photo ${index + 1} later`}>Move down</button>
          <button className="cms-secondary-button" type="button" onClick={() => onCoverChange(photo.mediaId)}>Use as cover</button>
          <button className="cms-secondary-button" type="button" onClick={() => onChange(photos.filter((_, position) => position !== index))} aria-label={`Remove photo ${index + 1} from gallery`}>Remove</button>
        </div>
      </div>
    </li>)}</ol>
    <h3>Add from media library</h3>
    <label className="cms-field"><span className="cms-label">Find a library photo</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search descriptions or captions" /></label>
    <div className="cms-review-library">{available.map((image) => <button className="cms-review-library-photo" key={image.id} type="button" disabled={photos.length >= 50} onClick={() => {
      if (!image.altText.trim()) {
        setMessage("Add alt text to this image in the Media library before using it in a gallery.");
        return;
      }
      setMessage("");
      onChange([...photos, { mediaId: image.id, url: image.url, altText: image.altText, caption: image.caption, credit: image.credit ?? "" }]);
    }}>
      <Image src={image.url} alt="" width={180} height={120} unoptimized />
      <span>Add: {image.altText || image.caption || image.id}</span>
    </button>)}</div>
    {available.length === 0 && <p className="cms-muted">No matching unused photos in the recent media library. Upload a photo below.</p>}
    {photos.length >= 50 && <p className="cms-alert">Gallery limit reached. Remove a photo before adding another.</p>}
    {message && <p className="cms-alert" role="alert">{message}</p>}
  </div>;
}
