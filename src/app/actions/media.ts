"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireCmsRole } from "@/lib/admin-auth";

const imageLimit = 15 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const registrationSchema = z.object({
  storagePath: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}-[a-zA-Z0-9._-]{1,120}$/i),
  fileName: z.string().min(1).max(120),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/avif"]),
  fileSize: z.number().int().positive().max(imageLimit),
  altText: z.string().trim().max(500),
  caption: z.string().trim().max(2000),
  photographerCredit: z.string().trim().max(200),
});

function matchesFileSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  }
  if (mimeType === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "image/avif") {
    return (
      String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
      ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)))
    );
  }
  return false;
}

export async function registerEditorialImage(input: unknown) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Image details are invalid." };
  const { client, identity } = await requireCmsRole(["owner", "editor", "contributor"]);
  if (parsed.data.storagePath.split("/")[0] !== identity.id) {
    return { ok: false, message: "You can only register files uploaded to your own media folder." };
  }
  const { data: file, error: downloadError } = await client.storage
    .from("editorial-media")
    .download(parsed.data.storagePath);
  if (downloadError) return { ok: false, message: `Uploaded image could not be verified: ${downloadError.message}` };
  if (file.size !== parsed.data.fileSize || !allowedTypes.has(parsed.data.mimeType)) {
    return { ok: false, message: "Uploaded image size or media type did not match the submission." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesFileSignature(bytes, parsed.data.mimeType)) {
    const { error: cleanupError } = await client.storage.from("editorial-media").remove([parsed.data.storagePath]);
    if (cleanupError) throw new Error(`Image signature was invalid and cleanup failed: ${cleanupError.message}`);
    return { ok: false, message: "The image file signature does not match its declared type." };
  }

  const { data, error } = await client
    .from("media")
    .insert({
      storage_bucket: "editorial-media",
      storage_path: parsed.data.storagePath,
      file_name: parsed.data.fileName,
      mime_type: parsed.data.mimeType,
      file_size: parsed.data.fileSize,
      alt_text: parsed.data.altText,
      caption: parsed.data.caption,
      photographer_credit: parsed.data.photographerCredit,
      is_public: true,
      uploaded_by: identity.id,
    })
    .select("id")
    .single();
  if (error) {
    const { error: cleanupError } = await client.storage
      .from("editorial-media")
      .remove([parsed.data.storagePath]);
    if (cleanupError) {
      throw new Error(
        `Media record failed (${error.message}) and uploaded file cleanup failed (${cleanupError.message}).`,
      );
    }
    return { ok: false, message: `Image metadata could not be saved: ${error.message}` };
  }
  revalidatePath("/admin/media");
  updateTag("published-cms");
  return { ok: true, message: "Image uploaded.", id: data.id };
}

export async function updateMediaMetadata(input: unknown) {
  if (input instanceof FormData) {
    input = Object.fromEntries(input.entries());
  }
  const parsed = z.object({
    id: z.string().uuid(),
    altText: z.string().trim().max(500),
    caption: z.string().trim().max(2000),
    photographerCredit: z.string().trim().max(200),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the media description fields." };
  const { client } = await requireCmsRole(["owner", "editor", "contributor"]);
  const { error } = await client.from("media").update({
    alt_text: parsed.data.altText,
    caption: parsed.data.caption,
    photographer_credit: parsed.data.photographerCredit,
  }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: `Media details were not saved: ${error.message}` };
  revalidatePath("/admin/media");
  updateTag("published-cms");
  return { ok: true, message: "Media details saved." };
}

export async function deleteMedia(input: string | FormData) {
  const id = input instanceof FormData ? String(input.get("id") ?? "") : input;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Media ID is invalid." };
  const { client } = await requireCmsRole(["owner", "editor", "contributor"]);
  const { data: media, error: loadError } = await client.from("media")
    .select("storage_bucket, storage_path")
    .eq("id", parsed.data)
    .maybeSingle();
  if (loadError) throw new Error(`Could not load media record: ${loadError.message}`);
  if (!media) return { ok: false, message: "Media record not found." };
  const { error } = await client.storage.from(media.storage_bucket).remove([media.storage_path]);
  if (error) return { ok: false, message: `File could not be deleted: ${error.message}` };
  const { error: recordError } = await client.from("media").delete().eq("id", parsed.data);
  if (recordError) {
    throw new Error(`File was removed but its media record could not be deleted: ${recordError.message}`);
  }
  revalidatePath("/admin/media");
  updateTag("published-cms");
  return { ok: true, message: "Media deleted." };
}
