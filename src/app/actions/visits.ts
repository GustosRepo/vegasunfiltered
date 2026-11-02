"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsRole } from "@/lib/admin-auth";
import { restaurantVisitSchema } from "@/lib/cms-schemas";

export async function saveRestaurantVisit(input: unknown) {
  if (input instanceof FormData) {
    const formData = input;
    input = {
      ...Object.fromEntries(formData.entries()),
      publicDetailsEnabled: formData.get("publicDetailsEnabled") === "on",
    };
  }
  const parsed = restaurantVisitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check visit details." };
  }
  let itemsOrdered: { name: string; amount?: number }[];
  try {
    const value: unknown = JSON.parse(parsed.data.itemsOrdered || "[]");
    if (!Array.isArray(value) || value.length > 100 || value.some((item) =>
      typeof item !== "object" || item === null ||
      !("name" in item) || typeof item.name !== "string" || !item.name.trim() || item.name.length > 160 ||
      ("amount" in item && (typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount < 0 || item.amount > 100000))
    )) {
      return { ok: false, message: "Ordered items must be a JSON array of { name, amount? } entries." };
    }
    itemsOrdered = value;
  } catch {
    return { ok: false, message: "Ordered items must be valid JSON, such as [{\"name\":\"Tacos\",\"amount\":18}]." };
  }
  const { client, identity } = await requireCmsRole(["owner", "editor"]);
  const row = {
    restaurant_id: parsed.data.restaurantId,
    visited_at: parsed.data.visitedAt,
    party_size: parsed.data.partySize,
    food_subtotal: parsed.data.foodSubtotal,
    drinks_subtotal: parsed.data.drinksSubtotal,
    additional_charges: parsed.data.additionalCharges,
    sales_tax: parsed.data.salesTax,
    tip: parsed.data.tip,
    manual_total_override:
      parsed.data.manualTotalOverride === "" ? null : parsed.data.manualTotalOverride,
    items_ordered: itemsOrdered,
    public_details_enabled: parsed.data.publicDetailsEnabled,
    experience_notes: parsed.data.experienceNotes,
    would_return:
      parsed.data.wouldReturn === "" ? null : parsed.data.wouldReturn === "yes",
    editorial_verdict: parsed.data.editorialVerdict,
    article_id: parsed.data.articleId || null,
    created_by: identity.id,
  };
  const query = parsed.data.id
    ? client.from("restaurant_visits").update(row).eq("id", parsed.data.id).select("id").single()
    : client.from("restaurant_visits").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) return { ok: false, message: `Visit was not saved: ${error.message}` };
  revalidatePath("/admin/visits");
  updateTag("published-cms");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  if (!parsed.data.id && data?.id) redirect(`/admin/visits/${data.id}/edit`);
  return { ok: true, message: "Visit saved.", id: data?.id };
}
