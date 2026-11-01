import { Field } from "@/components/form-fields";
import { SERVICES } from "@/server/admin-catalog";
import { AdminForm } from "../../admin-form";
import { SERVICE_LABEL } from "../../ui";
import { saveRestaurantAction } from "../catalog-actions";
import { Check, Hint, Row } from "../fields";

type Restaurant = {
  id: string;
  name: string;
  area: string;
  pickupAddress: string;
  city: string;
  orderEmail: string;
  phone: string;
  leadTimeHours: number;
  isActive: boolean;
  services: { service: string }[];
};

export function RestaurantForm({ restaurant }: { restaurant?: Restaurant }) {
  const offers = (service: string) => restaurant?.services.some((s) => s.service === service);
  return (
    <AdminForm action={saveRestaurantAction.bind(null, restaurant?.id ?? null)} submitLabel={restaurant ? "Sačuvaj" : "Dodaj restoran"} className="max-w-2xl">
      {!restaurant && (
        <>
          <Field label="Oznaka u adresi" name="id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="bistro-dorcol" />
          <Hint>Ne menja se kasnije: servingo.rs/sr/restorani/oznaka.</Hint>
        </>
      )}
      <Row>
        <Field label="Naziv" name="name" required defaultValue={restaurant?.name} />
        <Field label="Deo grada (vidi se na sajtu)" name="area" required defaultValue={restaurant?.area} />
      </Row>
      <Row>
        <Field label="Adresa za preuzimanje" name="pickupAddress" required defaultValue={restaurant?.pickupAddress} />
        <Field label="Grad" name="city" required defaultValue={restaurant?.city ?? "Beograd"} />
      </Row>
      <Hint>Adresa se ne prikazuje na sajtu; kupac je dobija mejlom posle uplate.</Hint>
      <Row>
        <Field label="Email za porudžbine" name="orderEmail" type="email" required defaultValue={restaurant?.orderEmail} />
        <Field label="Telefon" name="phone" type="tel" required defaultValue={restaurant?.phone} />
      </Row>
      <Field
        label="Rok za porudžbinu (sati unapred)"
        name="leadTimeHours"
        type="number"
        min={0}
        step={1}
        required
        defaultValue={restaurant?.leadTimeHours ?? 24}
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-2 text-[15px] font-medium">Usluge</legend>
        {SERVICES.map((service) => (
          <Check key={service} name={`service_${service}`} label={SERVICE_LABEL[service]} defaultChecked={offers(service)} />
        ))}
        <Hint>Pića ima svaki restoran.</Hint>
      </fieldset>
      <Check name="isActive" label="Prikazan na sajtu" defaultChecked={restaurant?.isActive ?? true} />
    </AdminForm>
  );
}
