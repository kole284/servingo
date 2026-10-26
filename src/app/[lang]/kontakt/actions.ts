"use server";

import { parseLocale } from "@/i18n/config";
import { submitContact, type FormResult } from "@/server/forms";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
};

export async function sendContact(_: FormResult, form: FormData): Promise<FormResult> {
  return submitContact(
    {
      name: text(form, "ime"),
      email: text(form, "email"),
      phone: text(form, "telefon"),
      orderCode: text(form, "porudzbina"),
      message: text(form, "poruka"),
      website: text(form, "website"),
    },
    parseLocale(text(form, "jezik")),
  );
}
