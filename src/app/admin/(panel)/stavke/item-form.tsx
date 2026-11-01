import { Field, TextArea } from "@/components/form-fields";
import { UNITS } from "@/server/admin-catalog";
import { AdminForm } from "../../admin-form";
import { SERVICE_LABEL, UNIT_LABEL } from "../../ui";
import { saveMenuItemAction } from "../catalog-actions";
import { Check, Hint, Row, Select } from "../fields";

type Item = {
  id: string;
  service: string;
  name: string;
  description: string;
  priceRsd: number;
  unit: string;
  unitNote: string | null;
  minQtyTenths: number;
  stepTenths: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
};

const units = (tenths: number) => String(tenths / 10).replace(".", ",");

/** A dish of `restaurant`, or a Servingo drink when restaurant is null. */
export function ItemForm({
  item,
  restaurant,
}: {
  item?: Item;
  restaurant: { id: string; services: string[] } | null;
}) {
  return (
    <AdminForm
      action={saveMenuItemAction.bind(null, item?.id ?? null, restaurant?.id ?? null)}
      submitLabel={item ? "Sačuvaj" : "Dodaj"}
      className="max-w-2xl"
    >
      <Row>
        <Field label="Naziv" name="name" required defaultValue={item?.name} />
        {restaurant && (
          <Select
            name="service"
            label="Usluga"
            defaultValue={item?.service}
            options={restaurant.services.map((s) => ({ value: s, label: SERVICE_LABEL[s as keyof typeof SERVICE_LABEL] }))}
          />
        )}
      </Row>
      <TextArea label="Opis" name="description" required rows={3} defaultValue={item?.description} />
      <Row>
        <Field label="Cena (din po jedinici)" name="priceRsd" type="number" min={0} step={1} required defaultValue={item?.priceRsd} />
        <Select
          name="unit"
          label="Jedinica"
          defaultValue={item?.unit ?? (restaurant ? "kg" : "paket")}
          options={UNITS.map((u) => ({ value: u, label: UNIT_LABEL[u] }))}
        />
      </Row>
      <Field label="Opis pakovanja" name="unitNote" defaultValue={item?.unitNote ?? ""} placeholder="paket od 6 × 1,5 l" />
      <Hint>Prikazuje se pored cene umesto jedinice. Nije obavezno.</Hint>
      <Row>
        <Field label="Najmanja količina" name="min" inputMode="decimal" required defaultValue={item ? units(item.minQtyTenths) : "1"} />
        <Field label="Korak" name="step" inputMode="decimal" required defaultValue={item ? units(item.stepTenths) : restaurant ? "0,5" : "1"} />
      </Row>
      <Hint>Za kilograme obično 1 i 0,5; za komade npr. 20 i 10.</Hint>
      <Field label="Redosled u meniju" name="sortOrder" type="number" min={0} step={1} defaultValue={item?.sortOrder ?? 0} />
      <Check name="isPopular" label="Najprodavanije (ide na vrh menija)" defaultChecked={item?.isPopular} />
      <Check name="isActive" label="U ponudi" defaultChecked={item?.isActive ?? true} />
    </AdminForm>
  );
}
