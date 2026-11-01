"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { saveMenuItem, saveRestaurant } from "@/server/admin-catalog";
import { CATALOG_TAG } from "@/server/catalog";
import type { AdminFormState } from "../admin-form";

export async function saveRestaurantAction(existingId: string | null, _: AdminFormState, form: FormData): Promise<AdminFormState> {
  const result = await saveRestaurant(existingId, form);
  if (!result.ok) return { error: result.error };
  // The site caches the catalog; show the change right away.
  updateTag(CATALOG_TAG);
  if (!existingId) redirect(`/admin/restorani/${result.id}`);
  return { saved: true };
}

export async function saveMenuItemAction(
  existingId: string | null,
  restaurantId: string | null,
  _: AdminFormState,
  form: FormData,
): Promise<AdminFormState> {
  const result = await saveMenuItem(existingId, restaurantId, form);
  if (!result.ok) return { error: result.error };
  updateTag(CATALOG_TAG);
  redirect(restaurantId ? `/admin/restorani/${restaurantId}` : "/admin/pica");
}
