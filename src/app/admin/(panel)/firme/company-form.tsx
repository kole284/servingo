import { Field } from "@/components/form-fields";
import { AdminForm } from "../../admin-form";
import { Check, Hint, Row } from "../fields";
import { saveCompanyAction } from "./actions";

type Company = {
  id: string;
  name: string;
  pib: string;
  mb: string;
  address: string;
  billingEmail: string;
  emailDomain: string | null;
  feePercent: number | null;
  isActive: boolean;
  members: { email: string }[];
};

export function CompanyForm({ company, defaultFee }: { company?: Company; defaultFee: number }) {
  return (
    <AdminForm action={saveCompanyAction.bind(null, company?.id ?? null)} submitLabel={company ? "Sačuvaj" : "Dodaj firmu"} className="max-w-2xl">
      <Field label="Naziv firme" name="name" required defaultValue={company?.name} autoComplete="organization" />
      <Row>
        <Field label="PIB" name="pib" required inputMode="numeric" pattern="\d{9}" defaultValue={company?.pib} />
        <Field label="Matični broj" name="mb" required inputMode="numeric" pattern="\d{8}" defaultValue={company?.mb} />
      </Row>
      <Row>
        <Field label="Adresa za fakturu" name="address" required defaultValue={company?.address} />
        <Field label="Email za fakture" name="billingEmail" type="email" required defaultValue={company?.billingEmail} />
      </Row>
      <Hint>Na ovaj email ide kopija svake porudžbine na fakturu.</Hint>
      <Row>
        <Field label="Domen poslovnog emaila" name="emailDomain" placeholder="firma.rs" defaultValue={company?.emailDomain ?? undefined} />
        <Field
          label={`Usluga platforme (%), prazno: ${defaultFee}`}
          name="feePercent"
          type="number"
          min={0}
          max={100}
          defaultValue={company?.feePercent ?? undefined}
        />
      </Row>
      <Hint>Sa domenom može da poruči svako ko ima email na njemu. Bez domena samo zaposleni sa liste ispod.</Hint>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-medium">Zaposleni koji smeju da poručuju (jedan email po redu)</span>
        <textarea
          name="members"
          rows={6}
          defaultValue={company?.members.map((m) => m.email).join("\n")}
          className="border border-line bg-bg px-5 py-3 text-base focus:border-ink focus:outline-none"
        />
      </label>
      <Check name="isActive" label="Firma može da poručuje na fakturu" defaultChecked={company?.isActive ?? true} />
    </AdminForm>
  );
}
