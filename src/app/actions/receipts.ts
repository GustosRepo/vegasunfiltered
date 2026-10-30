"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireCmsRole } from "@/lib/admin-auth";

const uuid = "[0-9a-f-]{36}";
const schema = z.object({
  visitId: z.string().uuid(),
  privatePath: z.string().regex(new RegExp(`^${uuid}/${uuid}-private-receipt\\.(pdf|jpg|jpeg|png|webp|avif)$`, "i")),
  publicPath: z.union([
    z.literal(""),
    z.string().regex(new RegExp(`^${uuid}/${uuid}-public-receipt\\.(jpg|jpeg|png|webp|avif)$`, "i")),
  ]),
});

function isImage(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  if (mimeType === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (mimeType === "image/avif") return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" && ["avif", "avis"].includes(String.fromCharCode(...bytes.slice(8, 12)));
  return false;
}

export async function attachVisitReceipts(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Receipt upload details are invalid." };
  const { client, identity } = await requireCmsRole(["owner", "editor"]);
  const privateParts = parsed.data.privatePath.split("/");
  const publicParts = parsed.data.publicPath ? parsed.data.publicPath.split("/") : [];
  if (privateParts[0] !== identity.id || (publicParts.length && publicParts[0] !== identity.id)) {
    return { ok: false, message: "You can only attach files uploaded to your own folder." };
  }
  const { data: privateFile, error: privateError } = await client.storage.from("private-receipts").download(parsed.data.privatePath);
  if (privateError) return { ok: false, message: `Private receipt could not be verified: ${privateError.message}` };
  const privateBytes = new Uint8Array(await privateFile.arrayBuffer());
  const validPdf = privateBytes[0] === 0x25 && privateBytes[1] === 0x50 && privateBytes[2] === 0x44 && privateBytes[3] === 0x46 && privateBytes[4] === 0x2d;
  if (!validPdf && !isImage(privateBytes, privateFile.type)) {
    return { ok: false, message: "Private receipt must be a valid PDF or supported image." };
  }

  if (parsed.data.publicPath) {
    const { data: publicFile, error: publicError } = await client.storage.from("editorial-media").download(parsed.data.publicPath);
    if (publicError) return { ok: false, message: `Redacted receipt could not be verified: ${publicError.message}` };
    const publicBytes = new Uint8Array(await publicFile.arrayBuffer());
    if (!isImage(publicBytes, publicFile.type)) return { ok: false, message: "Public receipt must be a supported image format." };
  }

  const { data: previous, error: loadError } = await client.from("restaurant_visits")
    .select("receipt_storage_path,public_receipt_storage_path")
    .eq("id", parsed.data.visitId).maybeSingle();
  if (loadError) throw new Error(`Could not load receipt record: ${loadError.message}`);
  if (!previous) return { ok: false, message: "Visit not found or unavailable." };
  const { error: updateError } = await client.from("restaurant_visits").update({
    receipt_storage_path: parsed.data.privatePath,
    public_receipt_storage_path: parsed.data.publicPath || null,
  }).eq("id", parsed.data.visitId);
  if (updateError) return { ok: false, message: `Receipt paths were not saved: ${updateError.message}` };

  const privateToRemove = previous.receipt_storage_path && previous.receipt_storage_path !== parsed.data.privatePath
    ? [previous.receipt_storage_path] : [];
  const publicToRemove = previous.public_receipt_storage_path && previous.public_receipt_storage_path !== parsed.data.publicPath
    ? [previous.public_receipt_storage_path] : [];
  const cleanupMessages: string[] = [];
  if (privateToRemove.length) {
    const { error } = await client.storage.from("private-receipts").remove(privateToRemove);
    if (error) cleanupMessages.push(`Previous private receipt could not be removed: ${error.message}`);
  }
  if (publicToRemove.length) {
    const { error } = await client.storage.from("editorial-media").remove(publicToRemove);
    if (error) cleanupMessages.push(`Previous public receipt could not be removed: ${error.message}`);
  }
  revalidatePath(`/admin/visits/${parsed.data.visitId}/edit`);
  updateTag("published-cms");
  const savedMessage = parsed.data.publicPath ? "Private and redacted public receipts attached." : "Private receipt attached.";
  return { ok: true, message: cleanupMessages.length ? `${savedMessage} ${cleanupMessages.join(" ")}` : savedMessage };
}
