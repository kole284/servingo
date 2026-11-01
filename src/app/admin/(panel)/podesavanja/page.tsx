import { Field } from "@/components/form-fields";
import { getSettingsForAdmin } from "@/server/admin-settings";
import { AdminForm } from "../../admin-form";
import { AdminPage, Badge } from "../../ui";
import { Hint, Row } from "../fields";
import { addCityAction, saveSettingsAction, toggleCityAction } from "./actions";

export default async function SettingsPage() {
  const { settings, cities } = await getSettingsForAdmin();
  return (
    <AdminPage title="Podešavanja">
      <section className="flex flex-col gap-5">
        <h2 className="caps-title text-base">Naknade i rokovi</h2>
        <AdminForm action={saveSettingsAction} submitLabel="Sačuvaj" className="max-w-2xl">
          <Row>
            <Field label="Dostava po računu (din)" name="deliveryFeeRsd" type="number" min={0} required defaultValue={settings.deliveryFeeRsd} />
            <Field label="Usluga platforme po računu (din)" name="platformFeeRsd" type="number" min={0} required defaultValue={settings.platformFeeRsd} />
          </Row>
          <Row>
            <Field label="Minimum za dostavu po računu (din)" name="deliveryMinimumRsd" type="number" min={0} required defaultValue={settings.deliveryMinimumRsd} />
            <Field label="Rok za uplatu (minuta)" name="pendingPaymentMinutes" type="number" min={5} max={1440} required defaultValue={settings.pendingPaymentMinutes} />
          </Row>
          <Hint>Nove vrednosti važe za nove porudžbine; postojeći računi zadržavaju svoje iznose.</Hint>
          <Row>
            <Field label="Email za porudžbine pića i povraćaje" name="servingoOrdersEmail" type="email" required defaultValue={settings.servingoOrdersEmail} />
            <Field label="Email za kontakt i prijave" name="contactEmail" type="email" required defaultValue={settings.contactEmail} />
          </Row>
        </AdminForm>
      </section>

      <section className="flex flex-col gap-5 border-t border-ink pt-6">
        <h2 className="caps-title text-base">Mesta sa dostavom</h2>
        <p className="max-w-2xl text-[15px] text-muted">Za mesto koje nije na listi (ili je isključeno) moguće je samo lično preuzimanje.</p>
        <ul className="flex max-w-2xl flex-col divide-y divide-line border-y border-line">
          {cities.map((city) => (
            <li key={city.id} className="flex items-center justify-between gap-4 py-3">
              <span className={city.isActive ? "" : "text-muted line-through"}>{city.name}</span>
              <form action={toggleCityAction.bind(null, city.id)} className="flex items-center gap-3">
                {!city.isActive && <Badge tone="muted">Isključeno</Badge>}
                <button type="submit" className="caps border border-ink px-3 py-2 hover:bg-surface">
                  {city.isActive ? "Isključi" : "Uključi"}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <AdminForm action={addCityAction} submitLabel="Dodaj mesto" className="max-w-md">
          <Field label="Novo mesto" name="name" required minLength={2} />
        </AdminForm>
      </section>
    </AdminPage>
  );
}
