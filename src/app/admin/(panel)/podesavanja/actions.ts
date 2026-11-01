"use server";

import { refresh, updateTag } from "next/cache";
import { addDeliveryCity, saveSettings, toggleDeliveryCity } from "@/server/admin-settings";
import { CATALOG_TAG } from "@/server/catalog";
import type { AdminFormState } from "../../admin-form";

// Fees and cities reach the site through the cached config, so each change refreshes it.

export async function saveSettingsAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const error = await saveSettings(form);
  if (error) return { error };
  updateTag(CATALOG_TAG);
  return { saved: true };
}

export async function addCityAction(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  const error = await addDeliveryCity(form);
  if (error) return { error };
  updateTag(CATALOG_TAG);
  refresh();
  return { saved: true };
}

export async function toggleCityAction(id: number) {
  await toggleDeliveryCity(id);
  updateTag(CATALOG_TAG);
  refresh();
}
