"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getAdminIdentity } from "@/lib/admin-auth";

const profileSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your public author name.").max(100, "Keep your author name within 100 characters."),
});

export async function saveEditorialProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({ displayName: formData.get("displayName") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { client, identity, accessError } = await getAdminIdentity();
  if (!client || !identity) return { ok: false, message: accessError ?? "Sign in again before updating your author profile." };

  // Keep Auth's profile metadata in sync so a later role change preserves the name.
  const { error: metadataError } = await client.auth.updateUser({ data: { full_name: parsed.data.displayName } });
  if (metadataError) return { ok: false, message: `Author name was not saved: ${metadataError.message}` };
  const { data, error } = await client.from("profiles")
    .update({ display_name: parsed.data.displayName }).eq("id", identity.id).select("id").maybeSingle();
  if (error) return { ok: false, message: `Author profile was not saved: ${error.message}` };
  if (!data) return { ok: false, message: "Your editorial profile is unavailable. Sign in again and retry saving." };

  revalidatePath("/admin", "layout");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  return { ok: true, message: "Author profile saved. Your reviews use this public byline." };
}
