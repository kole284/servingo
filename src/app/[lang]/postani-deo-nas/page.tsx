import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getDictionary } from "@/i18n/server";
import { PartnerForm } from "./partner-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: `${t.partner.title} | Servingo` };
}

export default async function PartnershipPage() {
  const { t } = await getDictionary();
  return (
    <PageShell title={t.partner.title} intro={t.partner.intro}>
      <section aria-labelledby="prijava-naslov" className="flex max-w-2xl flex-col gap-6 border-t border-ink pt-6">
        <h2 id="prijava-naslov" className="caps-title text-base">
          {t.partner.form.title}
        </h2>
        <PartnerForm />
      </section>
    </PageShell>
  );
}
