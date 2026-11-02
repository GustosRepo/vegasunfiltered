"use server";

import { revalidatePath } from "next/cache";
import { requireCmsRole } from "@/lib/admin-auth";
import { neighborhoodSchema } from "@/lib/cms-schemas";

export async function saveNeighborhood(input: unknown) {
  if (input instanceof FormData) input = Object.fromEntries(input.entries());
  const parsed = neighborhoodSchema.safeParse(input);
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
