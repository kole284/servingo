"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { issueCompanyInvoice, newCompanyCode, saveCompany, setCompanyInvoicePaid } from "@/server/admin-companies";
import type { AdminFormState } from "../../admin-form";

export async function saveCompanyAction(existingId: string | null, _: AdminFormState, form: FormData): Promise<AdminFormState> {
  const result = await saveCompany(existingId, form);
  if (!result.ok) return { error: result.error };
  if (!existingId) redirect(`/admin/firme/${result.id}`);
  return { saved: true };
}

export async function newCodeAction(companyId: string) {
  await newCompanyCode(companyId);
  refresh();
}

export async function issueInvoiceAction(companyId: string, month: string) {
  await issueCompanyInvoice(companyId, month);
  refresh();
}

export async function invoicePaidAction(invoiceId: string, paid: boolean) {
  await setCompanyInvoicePaid(invoiceId, paid);
  refresh();
}
