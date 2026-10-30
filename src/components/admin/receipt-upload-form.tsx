"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachVisitReceipts } from "@/app/actions/receipts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const privateTypes = [...imageTypes, "application/pdf"];
const maxBytes = 15 * 1024 * 1024;
const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "receipt";

export function ReceiptUploadForm({ visitId, privateReceiptUrl }: { visitId: string; privateReceiptUrl?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    const privateFile = formData.get("privateReceipt");
    const publicFile = formData.get("publicReceipt");
    const confirmRedaction = formData.get("confirmRedaction") === "on";
    if (!(privateFile instanceof File) || privateFile.size === 0) {
      setMessage("Choose the original receipt to store privately.");
      return;
    }
    if (privateFile.size > maxBytes || !privateTypes.includes(privateFile.type)) {
      setMessage("Use a PDF or supported image no larger than 15 MB for the private receipt.");
      return;
    }
    if (publicFile instanceof File && publicFile.size > 0) {
      if (!confirmRedaction) {
        setMessage("Confirm that the public copy has been redacted before uploading.");
        return;
      }
      if (!imageTypes.includes(publicFile.type) || publicFile.size > maxBytes) {
        setMessage("The public redacted copy must be a supported image no larger than 15 MB.");
        return;
      }
    }
    setBusy(true);
    setMessage("Uploading receipts…");
    const client = createSupabaseBrowserClient();
    const paths: { bucket: string; path: string }[] = [];
    try {
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw new Error(`Could not verify CMS account: ${authError.message}`);
      if (!user) throw new Error("Your session expired. Sign in again before uploading receipts.");
      const upload = async (file: File, suffix: "private-receipt" | "public-receipt", bucket: string) => {
        const path = `${user.id}/${crypto.randomUUID()}-${suffix}.${safeName(file.name.split(".").pop() ?? "file")}`;
        const { error } = await client.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(`Receipt upload failed: ${error.message}`);
        paths.push({ bucket, path });
        return path;
      };
      const privatePath = await upload(privateFile, "private-receipt", "private-receipts");
      const publicPath = publicFile instanceof File && publicFile.size > 0
        ? await upload(publicFile, "public-receipt", "editorial-media")
        : "";
      const result = await attachVisitReceipts({ visitId, privatePath, publicPath });
      if (!result.ok) throw new Error(result.message);
      setMessage(result.message);
      router.refresh();
    } catch (error) {
      const cleanupProblems: string[] = [];
      for (const entry of paths) {
        const { error: cleanupError } = await client.storage.from(entry.bucket).remove([entry.path]);
        if (cleanupError) cleanupProblems.push(cleanupError.message);
      }
      const detail = error instanceof Error ? error.message : "Receipt upload failed.";
      setMessage(cleanupProblems.length ? `${detail} Cleanup also failed: ${cleanupProblems.join("; ")}` : detail);
    } finally {
      setBusy(false);
    }
  }

  return <section className="cms-panel">
    <div className="cms-panel-header"><h2>Visit receipts</h2><p>Originals stay private to editors</p></div>
    <div className="cms-panel-body">
      {privateReceiptUrl && <p><a className="cms-secondary-button" href={privateReceiptUrl} rel="noreferrer" target="_blank">Open current private receipt</a></p>}
      <form action={submit} className="cms-form-grid">
        <label className="cms-field cms-form-span"><span className="cms-label">Private original (PDF or image)</span><input accept={`${imageTypes.join(",")},application/pdf`} name="privateReceipt" required type="file" /></label>
        <label className="cms-field cms-form-span"><span className="cms-label">Optional redacted public image</span><input accept={imageTypes.join(",")} name="publicReceipt" type="file" /></label>
        <label className="cms-checkbox-field cms-form-span"><input name="confirmRedaction" type="checkbox" /> I verified that the optional public image contains no names, payment details, or other private information.</label>
        <div className="cms-form-span"><p className="cms-muted">The public copy is not altered by the CMS. Only upload an image you have already redacted. The original receipt remains in a private storage bucket.</p><button className="cms-primary-button" disabled={busy} type="submit">{busy ? "Uploading…" : "Attach receipts"}</button>{message && <p className="cms-alert" role="status">{message}</p>}</div>
      </form>
    </div>
  </section>;
}
