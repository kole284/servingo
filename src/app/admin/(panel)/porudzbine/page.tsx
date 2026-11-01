import Link from "next/link";
import { formatDate, slotLabel } from "@/lib/booking";
import { dictionaryFor } from "@/i18n/server";
import { formatPrice } from "@/lib/menu";
import { listOrders } from "@/server/admin-orders";
import { effectiveStatus } from "@/server/orders";
import { AdminPage, BILL_STATUS, Badge, Cell, Empty, ORDER_STATUS, Table } from "../../ui";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const t = dictionaryFor("sr");

export default async function OrdersPage({ searchParams }: PageProps<"/admin/porudzbine">) {
  const params = await searchParams;
  const filter = { date: first(params.datum), status: first(params.status) };
  const orders = await listOrders(filter);

  return (
    <AdminPage title="Porudžbine">
      {/* A plain GET form: filters live in the URL, so a filtered list can be bookmarked. */}
      <form className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-[14px]">
          Datum termina
          <input type="date" name="datum" defaultValue={filter.date} className="h-11 border border-line px-3" />
        </label>
        <label className="flex flex-col gap-1 text-[14px]">
          Status
          <select name="status" defaultValue={filter.status ?? ""} className="h-11 border border-line bg-bg px-3">
            <option value="">Svi</option>
            {Object.entries(ORDER_STATUS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-11 caps border border-ink px-5 hover:bg-surface">
          Prikaži
        </button>
        {(filter.date || filter.status) && (
          <Link href="/admin/porudzbine" className="h-11 content-center text-[14px] underline underline-offset-4">
            Poništi filtere
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <Empty>Nema porudžbina za ove filtere.</Empty>
      ) : (
        <Table head={["Porudžbina", "Termin", "Kupac", "Iznos", "Status", "Računi"]}>
          {orders.map((order) => {
            const status = effectiveStatus(order) as keyof typeof ORDER_STATUS;
            return (
              <tr key={order.id}>
                <Cell>
                  <Link href={`/admin/porudzbine/${order.publicCode}`} className="font-medium underline underline-offset-4">
                    {order.publicCode}
                  </Link>
                </Cell>
                <Cell>
                  {formatDate(order.deliveryDate.toISOString().slice(0, 10), "sr")}
                  <br />
                  <span className="text-muted">{slotLabel(order.slotHour)}</span>
                </Cell>
                <Cell>
                  {order.customerName}
                  <br />
                  <span className="text-muted">{order.phone}</span>
                </Cell>
                <Cell className="tabular-nums">{formatPrice(order.totalRsd, "sr", t)}</Cell>
                <Cell>
                  <Badge tone={status === "paid" ? "accent" : "muted"}>{ORDER_STATUS[status]}</Badge>
                </Cell>
                <Cell>
                  <ul className="flex flex-col gap-1">
                    {order.bills.map((bill) => (
                      <li key={bill.id}>
                        {bill.sellerName} <span className="text-muted">· {BILL_STATUS[bill.status]}</span>
                      </li>
                    ))}
                  </ul>
                </Cell>
              </tr>
            );
          })}
        </Table>
      )}
    </AdminPage>
  );
}
