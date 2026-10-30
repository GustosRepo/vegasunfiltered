"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerEditorialImage } from "@/app/actions/media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const maxFileSize = 15 * 1024 * 1024;
const mimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "upload";
}

export function MediaUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    if (!file) {
      setMessage("Choose an image to upload.");
      return;
    }
    if (!mimeTypes.includes(file.type) || file.size === 0 || file.size > maxFileSize) {
      setMessage("Use a JPEG, PNG, WebP, or AVIF image no larger than 15 MB.");
      return;
    }
    const altText = String(formData.get("altText") ?? "").trim();
    const caption = String(formData.get("caption") ?? "").trim();
    const photographerCredit = String(formData.get("photographerCredit") ?? "").trim();
    if (!altText || altText.length > 500 || caption.length > 2000 || photographerCredit.length > 200) {
      setMessage("Add alt text and keep the description and credit within their length limits.");
      return;
    }
    setBusy(true);
    setMessage("Uploading image…");
    try {
      const client = createSupabaseBrowserClient();
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw new Error(`Could not verify CMS account: ${userError.message}`);
      if (!user) throw new Error("Your session expired. Sign in again before uploading.");
      const storagePath = `${user.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error: uploadError } = await client.storage.from("editorial-media").upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
      const result = await registerEditorialImage({
        storagePath,
        fileName: safeFileName(file.name),
        mimeType: file.type,
        fileSize: file.size,
        altText,
        caption,
        photographerCredit,
      });
      if (!result.ok) throw new Error(result.message);
      setMessage("Image uploaded.");
      setFile(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed. Retry the upload.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="cms-form-grid">
    <label className="cms-field cms-form-span"><span className="cms-label">Image file</span><input accept={mimeTypes.join(",")} onChange={(event) => setFile(event.target.files?.[0] ?? null)} required type="file" /></label>
    <label className="cms-field"><span className="cms-label">Alt text</span><input name="altText" required /></label>
    <label className="cms-field"><span className="cms-label">Photographer credit</span><input name="photographerCredit" /></label>
    <label className="cms-field cms-form-span"><span className="cms-label">Caption</span><textarea name="caption" /></label>
    <div className="cms-form-span"><button className="cms-primary-button" disabled={busy} type="submit">{busy ? "Uploading…" : "Upload image"}</button>{message && <p className="cms-alert" role="status">{message}</p>}</div>
  </form>;
}
