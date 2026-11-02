"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireCmsRole } from "@/lib/admin-auth";

const linkSchema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]).optional(),
  label: z.string().trim().min(2).max(160),
  destinationUrl: z.string().url().max(2048).refine((value) => new URL(value).protocol === "https:", "Affiliate links must use HTTPS."),
  disclosure: z.string().trim().max(1000),
  articleId: z.union([z.literal(""), z.string().uuid()]),
  active: z.boolean(),
});

export async function saveAffiliateLink(input: unknown) {
  if (input instanceof FormData) {
    const formData = input;
    input = { ...Object.fromEntries(formData.entries()), active: formData.get("active") === "on" };
  }
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check affiliate link details." };
  const { client, identity } = await requireCmsRole(["owner", "editor"]);
  const values = {
    label: parsed.data.label,
    destination_url: parsed.data.destinationUrl,
    disclosure: parsed.data.disclosure,
    article_id: parsed.data.articleId || null,
    is_active: parsed.data.active,
    created_by: identity.id,
  };
  const query = parsed.data.id
    ? client.from("affiliate_links").update(values).eq("id", parsed.data.id)
    : client.from("affiliate_links").insert(values);
  const { error } = await query;
  if (error) return { ok: false, message: `Affiliate link was not saved: ${error.message}` };
  revalidatePath("/admin/affiliates");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  return { ok: true, message: "Affiliate link saved." };
}

export async function setAffiliateLinkActive(input: unknown) {
  if (input instanceof FormData) input = Object.fromEntries(input.entries());
  const parsed = z.object({ id: z.string().uuid(), active: z.enum(["true", "false"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Affiliate link update is invalid." };
  const { client } = await requireCmsRole(["owner", "editor"]);
  const { error } = await client.from("affiliate_links")
    .update({ is_active: parsed.data.active === "true" }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: `Affiliate link status was not changed: ${error.message}` };
  revalidatePath("/admin/affiliates");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  return { ok: true, message: `Affiliate link ${parsed.data.active === "true" ? "activated" : "deactivated"}.` };
}
