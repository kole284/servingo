"use client";

import { useActionState, useState } from "react";
import { Field, FormAlert, FormSent, Honeypot, RadioCards, TextArea, submitKeeping } from "@/components/form-fields";
import { useI18n } from "@/i18n/provider";
import { sendApplication } from "./actions";

type Kind = "restoran" | "poslasticarnica" | "vinoteka" | "drugo";
const KINDS: Kind[] = ["restoran", "poslasticarnica", "vinoteka", "drugo"];

export function PartnerForm() {
  const { locale, t } = useI18n();
  const [result, dispatch, pending] = useActionState(sendApplication, null);
  const [kind, setKind] = useState<Kind>("restoran");
  const f = t.partner.form;

  if (result?.ok) return <FormSent title={f.sentTitle} text={f.sentText} />;

  return (
    <form onSubmit={submitKeeping(dispatch)} className="relative flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="jezik" value={locale} />
      <Honeypot />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[15px] font-medium">
          {f.kind}
          <span className="text-accent" aria-hidden="true"> *</span>
        </legend>
        <RadioCards<Kind>
          name="vrsta"
          label={f.kind}
          value={kind}
          onChange={setKind}
          options={KINDS.map((value) => ({ value, label: f.kinds[value] }))}
        />
      </fieldset>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={f.businessName} name="naziv" autoComplete="organization" required />
        <Field label={f.area} name="mesto" autoComplete="address-level2" required />
      </div>
      <Field label={f.contactName} name="ime" autoComplete="name" required minLength={2} />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={f.email} name="email" type="email" autoComplete="email" required />
        <Field label={f.phone} name="telefon" type="tel" autoComplete="tel" required />
      </div>
      <TextArea label={f.message} name="poruka" placeholder={f.messagePlaceholder} maxLength={5000} />
      {result && !result.ok && <FormAlert>{t.forms[result.error]}</FormAlert>}
      <button
        type="submit"
        disabled={pending}
        className="h-14 caps-cta bg-cta px-8 text-on-cta hover:bg-cta-strong disabled:bg-surface disabled:text-muted sm:self-start"
      >
        {pending ? t.forms.sending : f.send}
      </button>
      <p className="text-sm text-muted">{t.forms.privacy}</p>
    </form>
  );
}
