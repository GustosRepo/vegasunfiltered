"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ReviewPhoto } from "@/lib/cms-schemas";

export function ReviewGallery({ photos }: { photos: ReviewPhoto[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<ReviewPhoto | null>(null);
  if (!photos.length) return null;
  return <section className="review-gallery" aria-label="Photo gallery">
    <h2>Photo gallery</h2>
    <div className="review-gallery-grid">{photos.map((photo, index) => <figure key={photo.mediaId}>
      <button type="button" aria-label={`Enlarge photo ${index + 1}: ${photo.altText}`} onClick={() => {
        setSelected(photo);
        dialog.current?.showModal();
      }}><Image src={photo.url} alt={photo.altText} width={600} height={450} unoptimized /></button>
      {(photo.caption || photo.credit) && <figcaption>{photo.caption}{photo.credit && <small>Photo: {photo.credit}</small>}</figcaption>}
    </figure>)}</div>
    <dialog className="review-photo-dialog" ref={dialog} aria-label="Enlarged review photo" onClick={(event) => {
      if (event.target === event.currentTarget) dialog.current?.close();
    }}>
      <button className="review-photo-close" type="button" onClick={() => dialog.current?.close()} autoFocus>Close photo</button>
      {selected && <figure><Image src={selected.url} alt={selected.altText} width={1600} height={1200} unoptimized />
        {(selected.caption || selected.credit) && <figcaption>{selected.caption}{selected.credit && <small>Photo: {selected.credit}</small>}</figcaption>}
      </figure>}
    </dialog>
  </section>;
}
