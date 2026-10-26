"use client";

import { useActionState } from "react";
import { Field, FormAlert, FormSent, Honeypot, TextArea, submitKeeping } from "@/components/form-fields";
import { useI18n } from "@/i18n/provider";
import { sendContact } from "./actions";

export function ContactForm() {
  const { locale, t } = useI18n();
  const [result, dispatch, pending] = useActionState(sendContact, null);

  if (result?.ok) return <FormSent title={t.contact.form.sentTitle} text={t.contact.form.sentText} />;

  return (
    <form onSubmit={submitKeeping(dispatch)} className="relative flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="jezik" value={locale} />
      <Honeypot />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t.contact.form.name} name="ime" autoComplete="name" required minLength={2} />
        <Field label={t.contact.form.email} name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t.contact.form.phone} name="telefon" type="tel" autoComplete="tel" />
        <Field label={t.contact.form.orderCode} name="porudzbina" placeholder="SRV-7K3Q9" />
      </div>
      <TextArea label={t.contact.form.message} name="poruka" required minLength={10} maxLength={5000} />
      {result && !result.ok && <FormAlert>{t.forms[result.error]}</FormAlert>}
      <button
        type="submit"
        disabled={pending}
        className="h-14 caps-cta bg-cta px-8 text-on-cta hover:bg-cta-strong disabled:bg-surface disabled:text-muted sm:self-start"
      >
        {pending ? t.forms.sending : t.contact.form.send}
      </button>
      <p className="text-sm text-muted">{t.forms.privacy}</p>
    </form>
  );
}
