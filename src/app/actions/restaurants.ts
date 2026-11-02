"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getAdminIdentity, requireCmsRole } from "@/lib/admin-auth";
import { restaurantSchema } from "@/lib/cms-schemas";

export type RestaurantActionResult = { ok: boolean; message: string; id?: string };

export async function saveRestaurant(input: unknown): Promise<RestaurantActionResult> {
  if (input instanceof FormData) {
    const formData = input;
    input = {
      ...Object.fromEntries(formData.entries()),
      galleryMediaIds: formData.getAll("galleryMediaIds").filter((value): value is string => typeof value === "string"),
    };
  }
  const parsed = restaurantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check restaurant fields." };
  }
  const { client, identity, accessError } = await getAdminIdentity();
  if (!client || !identity) return { ok: false, message: accessError ?? "Your CMS session is unavailable. Sign in again before creating a place." };
  if (identity.role === "contributor") return { ok: false, message: "Only owners and editors can create or change places." };
  let operatingHours: Record<string, string>;
  try {
    const hours: unknown = JSON.parse(parsed.data.operatingHours || "{}");
    if (typeof hours !== "object" || hours === null || Array.isArray(hours) ||
      Object.entries(hours).length > 14 ||
      Object.entries(hours).some(([day, value]) => day.length > 30 || typeof value !== "string" || value.length > 120)) {
      return { ok: false, message: "Operating hours must be a JSON object with day names and text values." };
    }
    operatingHours = hours as Record<string, string>;
  } catch {
    return { ok: false, message: "Operating hours must be valid JSON, such as {\"Monday\":\"Closed\"}." };
  }
  const mediaIds = [...new Set([parsed.data.featuredMediaId, ...parsed.data.galleryMediaIds].filter(Boolean))];
  if (mediaIds.length) {
    const { data: availableMedia, error: mediaError } = await client.from("media").select("id")
      .in("id", mediaIds).eq("storage_bucket", "editorial-media").eq("is_public", true);
    if (mediaError) throw new Error(`Could not verify restaurant images: ${mediaError.message}`);
    if ((availableMedia?.length ?? 0) !== mediaIds.length) {
      return { ok: false, message: "Choose only available public editorial images from the media library." };
    }
  }
  const row = {
    name: parsed.data.name,
    place_type: parsed.data.placeType,
    slug: parsed.data.slug,
    description: parsed.data.description,
    cuisine: parsed.data.cuisine,
    neighborhood_id: parsed.data.neighborhoodId || null,
    featured_media_id: parsed.data.featuredMediaId || null,
    gallery_media_ids: parsed.data.galleryMediaIds,
    address: parsed.data.address,
    city: parsed.data.city,
    state: parsed.data.state,
    postal_code: parsed.data.postalCode,
    website: parsed.data.website || null,
    phone: parsed.data.phone,
    price_range: parsed.data.priceRange || null,
    parking_information: parsed.data.parkingInformation,
    reservation_information: parsed.data.reservationInformation,
    operating_hours: operatingHours,
    visit_status: parsed.data.visitStatus,
    internal_notes: parsed.data.internalNotes,
    created_by: identity.id,
  };
  const query = parsed.data.id
    ? client.from("restaurants").update(row).eq("id", parsed.data.id).select("id").single()
    : client.from("restaurants").insert(row).select("id").single();
  const { data, error } = await query;
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That place URL slug is already in use. Select the existing place, or use a different slug for another branch." };
    return { ok: false, message: `Restaurant was not saved: ${error.message}` };
  }
  revalidatePath("/admin/places");
  updateTag("published-cms");
  return { ok: true, message: "Place saved.", id: data.id };
}

export async function deleteRestaurant(input: string | FormData): Promise<RestaurantActionResult> {
  const id = input instanceof FormData ? String(input.get("id") ?? "") : input;
  const parsed = restaurantSchema.shape.id.unwrap().safeParse(id);
  if (!parsed.success) return { ok: false, message: "Restaurant ID is invalid." };
  const { client } = await requireCmsRole(["owner", "editor"]);
  const { error } = await client.from("restaurants").delete().eq("id", parsed.data);
  if (error) return { ok: false, message: `Restaurant was not deleted: ${error.message}` };
  revalidatePath("/admin/places");
  updateTag("published-cms");
  return { ok: true, message: "Place deleted." };
}
