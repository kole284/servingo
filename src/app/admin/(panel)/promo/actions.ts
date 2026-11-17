"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { markPromoPaid, savePromoCode } from "@/server/admin-promo";
import type { AdminFormState } from "../../admin-form";

export async function savePromoAction(existingId: string | null, _: AdminFormState, form: FormData): Promise<AdminFormState> {
  const result = await savePromoCode(existingId, form);
  if (!result.ok) return { error: result.error };
  if (!existingId) redirect(`/admin/promo/${result.id}`);
  return { saved: true };
}

/** "Označi isplaćeno" in the month's table. */
export async function markPaidAction(promoCodeId: string, month: string) {
  await markPromoPaid(promoCodeId, month);
  refresh();
}
