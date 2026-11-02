"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteArticle } from "@/app/actions/articles";
import { deleteMedia } from "@/app/actions/media";
import { deleteRestaurant } from "@/app/actions/restaurants";

export function DeleteArticleButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const result = await deleteArticle(id);
      setMessage(result.message);
      if (result.ok) router.push("/admin/reviews");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Article could not be deleted.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="cms-delete-control">
    {confirm ? <><span>Delete this review permanently?</span><button className="cms-danger-button" disabled={busy} onClick={() => void remove()} type="button">Confirm delete</button><button className="cms-secondary-button" onClick={() => setConfirm(false)} type="button">Cancel</button></> : <button className="cms-danger-button" onClick={() => setConfirm(true)} type="button">Delete review</button>}
    {message && <span className="cms-muted" role="status">{message}</span>}
  </div>;
}

export function DeleteRestaurantButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const result = await deleteRestaurant(id);
      setMessage(result.message);
      if (result.ok) router.push("/admin/places");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restaurant could not be deleted.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="cms-delete-control">
    {confirm ? <><span>Delete this place? Recorded visits prevent deletion.</span><button className="cms-danger-button" disabled={busy} onClick={() => void remove()} type="button">Confirm delete</button><button className="cms-secondary-button" onClick={() => setConfirm(false)} type="button">Cancel</button></> : <button className="cms-danger-button" onClick={() => setConfirm(true)} type="button">Delete place</button>}
    {message && <span className="cms-muted" role="status">{message}</span>}
  </div>;
}

export function DeleteMediaButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const result = await deleteMedia(id);
      setMessage(result.message);
      if (result.ok) router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image could not be deleted.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="cms-delete-control">
    {confirm ? <><span>Delete this image? Articles using it may lose the asset.</span><button className="cms-danger-button" disabled={busy} onClick={() => void remove()} type="button">Confirm delete</button><button className="cms-secondary-button" onClick={() => setConfirm(false)} type="button">Cancel</button></> : <button className="cms-danger-button" onClick={() => setConfirm(true)} type="button">Delete image</button>}
    {message && <span className="cms-muted" role="status">{message}</span>}
  </div>;
}
