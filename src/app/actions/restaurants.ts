"use server";

import { revalidatePath } from "next/cache";
import { requireCmsRole } from "@/lib/admin-auth";
import { restaurantSchema } from "@/lib/cms-schemas";

export type RestaurantActionResult = { ok: boolean; message: string; id?: string };

export async function saveRestaurant(input: unknown): Promise<RestaurantActionResult> {
  if (input instanceof FormData) {
    input = Object.fromEntries(input.entries());
  }
  const parsed = restaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check restaurant fields." };
  }
  const { client, identity } = await requireCmsRole(["owner", "editor"]);
  const row = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    cuisine: parsed.data.cuisine,
    neighborhood_id: parsed.data.neighborhoodId || null,
    address: parsed.data.address,
    city: parsed.data.city,
    state: parsed.data.state,
    postal_code: parsed.data.postalCode,
    website: parsed.data.website || null,
    phone: parsed.data.phone,
    price_range: parsed.data.priceRange || null,
    parking_information: parsed.data.parkingInformation,
    reservation_information: parsed.data.reservationInformation,
    internal_notes: parsed.data.internalNotes,
    created_by: identity.id,
  };
  const query = parsed.data.id
    ? client.from("restaurants").update(row).eq("id", parsed.data.id).select("id").single()
    : client.from("restaurants").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That restaurant slug is already in use." };
    return { ok: false, message: `Restaurant was not saved: ${error.message}` };
  }
  revalidatePath("/admin/restaurants");
  return { ok: true, message: "Restaurant saved.", id: data.id };
}

export async function deleteRestaurant(input: string | FormData): Promise<RestaurantActionResult> {
  const id = input instanceof FormData ? String(input.get("id") ?? "") : input;
  const parsed = restaurantSchema.shape.id.unwrap().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Restaurant ID is invalid." };
  const { client } = await requireCmsRole(["owner", "editor"]);
  const { error } = await client.from("restaurants").delete().eq("id", parsed.data);
  if (error) return { ok: false, message: `Restaurant was not deleted: ${error.message}` };
  revalidatePath("/admin/restaurants");
  return { ok: true, message: "Restaurant deleted." };
}
