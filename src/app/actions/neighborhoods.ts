"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCmsRole } from "@/lib/admin-auth";

const schema = z.object({
  id: z.union([z.literal(""), z.string().uuid()]).optional(),
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(3000),
  seoTitle: z.string().trim().max(70),
  metaDescription: z.string().trim().max(180),
});

export async function saveNeighborhood(input: unknown) {
  if (input instanceof FormData) input = Object.fromEntries(input.entries());
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check neighborhood details." };
  const { client, identity } = await requireCmsRole(["owner", "editor"]);
  const values = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    seo_title: parsed.data.seoTitle || null,
    meta_description: parsed.data.metaDescription || null,
    created_by: identity.id,
  };
  const query = parsed.data.id
    ? client.from("neighborhoods").update(values).eq("id", parsed.data.id)
    : client.from("neighborhoods").insert(values);
  const { error } = await query;
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That neighborhood name or slug already exists." };
    return { ok: false, message: `Neighborhood was not saved: ${error.message}` };
  }
  revalidatePath("/admin/neighborhoods");
  return { ok: true, message: "Neighborhood saved." };
}
