import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionaryFor } from "@/i18n/server";
import { formatDate, slotLabel } from "@/lib/booking";
import { formatPrice, formatQuantity } from "@/lib/menu";
import { getOrderForAdmin } from "@/server/admin-orders";
import { nextBillStatus } from "@/server/bills";
import { billUrl, orderStatusUrl } from "@/server/notifications";
import { effectiveStatus } from "@/server/orders";
import { AdminPage, BILL_STATUS, Badge, Cell, ORDER_STATUS, Table } from "../../../ui";
import { advanceBill } from "../actions";

const t = dictionaryFor("sr");
const price = (amount: number) => formatPrice(amount, "sr", t);
const dateTime = (date: Date) =>
  new Intl.DateTimeFormat("sr-Latn-RS", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Belgrade" }).format(date);

const NEXT_LABEL = { confirmed: "Potvrdi", ready: "Spremna", delivered: "Isporučena", picked_up: "Preuzeta" } as const;

function Facts({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="text-[15px] font-medium">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export default async function OrderPage({ params }: PageProps<"/admin/porudzbine/[code]">) {
  const order = await getOrderForAdmin((await params).code);
  if (!order) notFound();
  const status = effectiveStatus(order) as keyof typeof ORDER_STATUS;

  return (
    <AdminPage
      title={`Porudžbina ${order.publicCode}`}
      actions={
        <Link href={orderStatusUrl(order)} className="inline-flex h-11 items-center caps border border-ink px-5 hover:bg-surface">
          Strana za kupca
        </Link>
      }
    >
      <div className="flex flex-col gap-6">
        <p>
          <Badge tone={status === "paid" ? "accent" : "muted"}>{ORDER_STATUS[status]}</Badge>
        </p>
        <Facts
          rows={[
            ["Termin", `${formatDate(order.deliveryDate.toISOString().slice(0, 10), "sr")}, ${slotLabel(order.slotHour)}`],
            ["Ukupno", price(order.totalRsd)],
            ["Napravljena", dateTime(order.createdAt)],
            ["Plaćena", order.paidAt && dateTime(order.paidAt)],
            ["Kupac", order.customerName],
            ["Telefon", order.phone],
            ["Email", order.email],
            ["Adresa dostave", order.address && [order.address, order.city].filter(Boolean).join(", ")],
            ["Firma", order.buyerType === "pravno" ? `${order.companyName}, PIB ${order.pib}, MB ${order.mb}` : null],
            ["Jezik", order.locale.toUpperCase()],
          ]}
        />
      </div>

      {order.bills.map((bill) => {
        const next = status === "paid" ? nextBillStatus(bill) : null;
        return (
          <section key={bill.id} className="flex flex-col gap-4 border-t border-ink pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="caps-title text-base">{bill.sellerName}</h2>
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{BILL_STATUS[bill.status]}</Badge>
                <Badge tone="muted">{bill.fulfilment === "delivery" ? "Dostava" : "Lično preuzimanje"}</Badge>
                {next && (
                  <form action={advanceBill.bind(null, bill.id, bill.status)}>
                    <button type="submit" className="h-10 caps-cta bg-cta px-4 text-on-cta hover:bg-cta-strong">
                      {NEXT_LABEL[next]}
                    </button>
                  </form>
                )}
              </div>
            </div>
            {bill.restaurant && (
              <p className="text-[14px] text-muted">
                Restoran: {[bill.restaurant.pickupAddress, bill.restaurant.city].filter(Boolean).join(", ")} · {bill.restaurant.phone} ·{" "}
                <Link href={billUrl(bill.id)} className="underline underline-offset-4">
                  link za restoran
                </Link>
              </p>
            )}
            <Table head={["Stavka", "Količina", "Cena", "Iznos"]}>
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <Cell>
                    {item.name}
                    {item.isDrink && <span className="text-muted"> · piće (Servingo)</span>}
                  </Cell>
                  <Cell>{formatQuantity(item, item.quantityTenths / 10, "sr", t)}</Cell>
                  <Cell className="tabular-nums">
                    {price(item.unitPriceRsd)} / {item.unitNote ?? item.unit}
                  </Cell>
                  <Cell className="tabular-nums">{price(item.lineTotalRsd)}</Cell>
                </tr>
              ))}
            </Table>
            <p className="text-right text-[15px] tabular-nums">
              Jela i pića {price(bill.subtotalRsd)} · dostava {price(bill.deliveryFeeRsd)} · usluga {price(bill.platformFeeRsd)} ·{" "}
              <strong>ukupno {price(bill.totalRsd)}</strong>
            </p>
          </section>
        );
      })}

      <section className="flex flex-col gap-4 border-t border-ink pt-5">
        <h2 className="caps-title text-base">Uplate</h2>
        {order.payments.length === 0 ? (
          <p className="text-[15px] text-muted">Još nema pokušaja plaćanja.</p>
        ) : (
          <Table head={["Vreme", "Provajder", "Oznaka", "Iznos", "Ishod"]}>
            {order.payments.map((payment) => (
              <tr key={payment.id}>
                <Cell>{dateTime(payment.createdAt)}</Cell>
                <Cell>{payment.provider}</Cell>
                <Cell className="font-mono text-[13px]">{payment.providerRef}</Cell>
                <Cell className="tabular-nums">{price(payment.amountRsd)}</Cell>
                <Cell>{payment.status === "succeeded" ? "Uspela" : "Nije uspela"}</Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-ink pt-5">
        <h2 className="caps-title text-base">Poslati mejlovi</h2>
        {order.notifications.length === 0 ? (
          <p className="text-[15px] text-muted">Mejlovi se šalju kad porudžbina bude plaćena.</p>
        ) : (
          <Table head={["Vreme", "Kome", "Adresa", "Vrsta", "Stanje"]}>
            {order.notifications.map((n) => (
              <tr key={n.id}>
                <Cell>{dateTime(n.createdAt)}</Cell>
                <Cell>{{ customer: "Kupac", restaurant: "Restoran", servingo: "Servingo" }[n.recipient]}</Cell>
                <Cell>{n.toEmail}</Cell>
                <Cell>{n.template}</Cell>
                <Cell>
                  {{ sent: "Poslat", logged: "Samo u logu (nema Resend ključa)", failed: "Nije poslat" }[n.status]}
                  {n.error && <span className="block text-[12px] text-muted">{n.error}</span>}
                </Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </AdminPage>
  );
}
