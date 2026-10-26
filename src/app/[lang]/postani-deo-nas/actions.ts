"use server";

import { parseLocale } from "@/i18n/config";
import { submitPartnerApplication, type FormResult } from "@/server/forms";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
};

export async function sendApplication(_: FormResult, form: FormData): Promise<FormResult> {
  return submitPartnerApplication(
    {
      businessName: text(form, "naziv"),
      kind: text(form, "vrsta"),
      contactName: text(form, "ime"),
      email: text(form, "email"),
      phone: text(form, "telefon"),
      area: text(form, "mesto"),
      message: text(form, "poruka"),
      website: text(form, "website"),
    },
    parseLocale(text(form, "jezik")),
  );
}
