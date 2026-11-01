import Link from "next/link";
import { dictionaryFor } from "@/i18n/server";
import { belgradeTodayIso, formatDate, slotLabel } from "@/lib/booking";
import { formatQuantity } from "@/lib/menu";
import { drinksForDay } from "@/server/admin-orders";
import { AdminPage, Cell, Empty, Table } from "../../ui";

const t = dictionaryFor("sr");
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ProcurementPage({ searchParams }: PageProps<"/admin/nabavka">) {
  const requested = first((await searchParams).datum);
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : belgradeTodayIso();
  const { totals, bills } = await drinksForDay(date);

  return (
    <AdminPage title="Pića za nabavku">
      <form className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-[14px]">
          Dan dostave
          <input type="date" name="datum" defaultValue={date} className="h-11 border border-line px-3" />
        </label>
        <button type="submit" className="h-11 caps border border-ink px-5 hover:bg-surface">
          Prikaži
        </button>
      </form>
      <p className="text-[15px] text-muted">{formatDate(date, "sr")}. Samo plaćene porudžbine.</p>

      {totals.length === 0 ? (
        <Empty>Za ovaj dan nema plaćenih porudžbina sa pićima.</Empty>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="caps-title text-base">Ukupno</h2>
            <Table head={["Piće", "Pakovanje", "Količina"]}>
              {totals.map((total) => (
                <tr key={`${total.name}|${total.unitNote}`}>
                  <Cell className="font-medium">{total.name}</Cell>
                  <Cell>{total.unitNote ?? total.unit}</Cell>
                  <Cell>{formatQuantity(total, total.tenths / 10, "sr", t)}</Cell>
                </tr>
              ))}
            </Table>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="caps-title text-base">Po računu</h2>
            <Table head={["Termin", "Porudžbina", "Za koga", "Kuda", "Pića"]}>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <Cell>{slotLabel(bill.order.slotHour)}</Cell>
                  <Cell>
                    <Link href={`/admin/porudzbine/${bill.order.publicCode}`} className="underline underline-offset-4">
                      {bill.order.publicCode}
                    </Link>
                  </Cell>
                  <Cell>{bill.sellerName}</Cell>
                  <Cell>
                    {/* Drinks on a restaurant's bill go to the restaurant, which hands them over with the food. */}
                    {bill.restaurant ? (
                      <>
                        Restoranu: {[bill.restaurant.pickupAddress, bill.restaurant.city].filter(Boolean).join(", ")}
                        <span className="block text-muted">
                          {bill.fulfilment === "delivery" ? "restoran dostavlja kupcu" : "kupac preuzima u restoranu"}
                        </span>
                      </>
                    ) : bill.fulfilment === "delivery" ? (
                      `Kupcu: ${[bill.order.address, bill.order.city].filter(Boolean).join(", ")}`
                    ) : (
                      `Kupac preuzima od Servinga (${bill.order.customerName}, ${bill.order.phone})`
                    )}
                  </Cell>
                  <Cell>
                    <ul>
                      {bill.items.map((item) => (
                        <li key={item.id}>
                          {item.name}: {formatQuantity(item, item.quantityTenths / 10, "sr", t)}
                        </li>
                      ))}
                    </ul>
                  </Cell>
                </tr>
              ))}
            </Table>
          </section>
        </>
      )}
    </AdminPage>
  );
}
