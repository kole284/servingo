import { Field } from "@/components/form-fields";
import { AdminForm } from "../../admin-form";
import { savePromoAction } from "./actions";
import { Check, Hint, Row } from "../fields";

type Promo = {
  id: string;
  code: string;
  ownerName: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  commissionTenths: number;
  isActive: boolean;
  expiresAt: Date | null;
  note: string | null;
};

const BELGRADE_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade" });

export function PromoForm({ promo }: { promo?: Promo }) {
  return (
    <AdminForm action={savePromoAction.bind(null, promo?.id ?? null)} submitLabel={promo ? "Sačuvaj" : "Dodaj kod"} className="max-w-2xl">
      <Row>
        <Field label="Kod" name="code" required defaultValue={promo?.code} placeholder="MARKO10" autoComplete="off" />
        <Field
          label="Provizija vlasnika (%)"
          name="commission"
          required
          inputMode="decimal"
          defaultValue={promo ? String(promo.commissionTenths / 10).replace(".", ",") : undefined}
          placeholder="5"
        />
      </Row>
      <Hint>Provizija se računa od jela i pića posle popusta, bez dostave. Promena važi samo za nove porudžbine.</Hint>
      <Row>
        <Field label="Vlasnik koda" name="ownerName" required defaultValue={promo?.ownerName} />
        <Field label="Email vlasnika" name="ownerEmail" type="email" defaultValue={promo?.ownerEmail ?? undefined} />
      </Row>
      <Row>
        <Field label="Telefon vlasnika" name="ownerPhone" type="tel" defaultValue={promo?.ownerPhone ?? undefined} />
        <Field
          label="Važi do (prazno: bez roka)"
          name="expiresAt"
          type="date"
          defaultValue={promo?.expiresAt ? BELGRADE_DAY.format(promo.expiresAt) : undefined}
        />
      </Row>
      <Field label="Napomena (npr. račun za isplatu)" name="note" defaultValue={promo?.note ?? undefined} />
      <Check name="isActive" label="Kod je aktivan" defaultChecked={promo?.isActive ?? true} />
    </AdminForm>
  );
}
