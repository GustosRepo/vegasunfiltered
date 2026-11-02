"use client";

import { useState } from "react";
import { saveRestaurant } from "@/app/actions/restaurants";

export type ReviewPlace = { id: string; name: string; place_type: "restaurant" | "activity" };

export function InlinePlace({ reviewType, onCreated, onBusyChange }: {
  reviewType: ReviewPlace["place_type"]; onCreated: (place: ReviewPlace) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Las Vegas");
  const [state, setState] = useState("NV");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const slug = customSlug ?? name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function create() {
    setBusy(true);
    onBusyChange(true);
    setMessage("");
    try {
      if (!slug || name.trim().length < 2 || !address.trim() || city.trim().length < 2 || state.trim().length < 2) {
        setMessage("Enter a place name, URL slug, street address/location, city, and state.");
        return;
      }
      const result = await saveRestaurant({
        name, slug, placeType: reviewType,
        address, city, state, description: "", cuisine: "", neighborhoodId: "", featuredMediaId: "",
        galleryMediaIds: [], postalCode: "", website: "", phone: "", priceRange: "",
        parkingInformation: "", reservationInformation: "", operatingHours: "{}",
        visitStatus: "visited", internalNotes: "",
      });
      if (!result.ok || !result.id) {
        setMessage(result.message);
        return;
      }
      onCreated({ id: result.id, name: name.trim(), place_type: reviewType });
      setName(""); setAddress(""); setCustomSlug(null); setOpen(false);
      setMessage("Place created and selected. Save the review to keep its link.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Place creation failed. Retry without leaving the review.");
    } finally { setBusy(false); onBusyChange(false); }
  }

  return <div className="cms-inline-place cms-form-span">
    <button className="cms-secondary-button" type="button" disabled={busy} onClick={() => setOpen(!open)}>{open ? "Cancel new place" : "Create and link place"}</button>
    {open && <section aria-label="Create a place without leaving this review" className="cms-panel-body">
      <h3>Add {reviewType === "activity" ? "activity" : "restaurant"}</h3>
      <p className="cms-muted">Search existing places first to avoid duplicates. Only the name and location are needed now; add other details later. Your review stays open.</p>
      <div className="cms-form-grid">
        <label className="cms-field"><span className="cms-label">New place name</span><input value={name} maxLength={160} disabled={busy} onChange={(event) => setName(event.target.value)} /></label>
        <label className="cms-field"><span className="cms-label">New place URL slug</span><input value={slug} disabled={busy} onChange={(event) => setCustomSlug(event.target.value)} /><small>Generated from the name. For another branch, add its neighborhood to keep the slug unique.</small></label>
        <label className="cms-field"><span className="cms-label">Street address / location</span><input value={address} maxLength={250} disabled={busy} onChange={(event) => setAddress(event.target.value)} /></label>
        <label className="cms-field"><span className="cms-label">City</span><input value={city} maxLength={100} disabled={busy} onChange={(event) => setCity(event.target.value)} /></label>
        <label className="cms-field"><span className="cms-label">State</span><input value={state} maxLength={50} disabled={busy} onChange={(event) => setState(event.target.value)} /></label>
      </div>
      <button className="cms-primary-button" disabled={busy} type="button" onClick={() => void create()}>{busy ? "Creating place..." : "Create place and select"}</button>
    </section>}
    {message && <p className="cms-alert" role="status">{message}</p>}
  </div>;
}
