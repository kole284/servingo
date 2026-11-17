import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionaryFor } from "@/i18n/server";
import { formatDate, slotLabel } from "@/lib/booking";
import { formatPrice } from "@/lib/menu";
import { companyMonth, getCompany } from "@/server/admin-companies";
import { isMonth, monthOf } from "@/server/admin-promo";
import { getSettingsForAdmin } from "@/server/admin-settings";
import { AdminPage, Badge, Cell, Empty, Table } from "../../../ui";
import { invoicePaidAction, issueInvoiceAction, newCodeAction } from "../actions";
import { CompanyForm } from "../company-form";

const t = dictionaryFor("sr");
const price = (amount: number) => formatPrice(amount, "sr", t);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const day = new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", dateStyle: "medium" });

export default async function CompanyPage({ params, searchParams }: PageProps<"/admin/firme/[id]">) {
  const { id } = await params;
  const asked = first((await searchParams).mesec);
  const month = isMonth(asked) ? asked : monthOf(new Date());
  const [company, settings, overview] = await Promise.all([getCompany(id), getSettingsForAdmin(), companyMonth(id, month)]);
  if (!company) notFound();
  const invoice = company.invoices.find((i) => i.month === month);
  const notOnInvoice = overview.orders.filter((order) => order.companyInvoiceId !== invoice?.id).length;

  return (
    <AdminPage title={company.name}>
      <section className="flex flex-col gap-3 bg-surface p-5">
        <p className="text-[15px]">Kod koji zaposleni upisuju pri plaćanju:</p>
        <p className="font-mono text-2xl font-medium">{company.orderCode}</p>
        <form action={newCodeAction.bind(null, company.id)}>
          <button type="submit" className="caps border border-ink px-4 py-2 text-[12px] hover:bg-bg">
            Napravi novi kod (stari prestaje da važi)
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="caps-title text-base">Porudžbine za mesec</h2>
          <form className="flex items-end gap-3">
            <label className="flex flex-col gap-1 text-[14px]">
              Mesec
              <input type="month" name="mesec" defaultValue={month} className="h-11 border border-line px-3" />
            </label>
            <button type="submit" className="h-11 caps border border-ink px-5 hover:bg-surface">
              Prikaži
            </button>
          </form>
        </div>

        {overview.orders.length === 0 ? (
          <Empty>U ovom mesecu firma nije poručivala na fakturu.</Empty>
        ) : (
          <>
            <dl className="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-4">
              {[
                ["Jela i pića", overview.totals.subtotalRsd],
                ["Dostava", overview.totals.deliveryRsd],
                [`Usluga platforme`, overview.totals.feeRsd],
                ["Za naplatu", overview.totals.totalRsd],
              ].map(([label, amount]) => (
                <div key={label} className="flex flex-col">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-lg font-medium tabular-nums">{price(Number(amount))}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-4">
              {invoice && (
                <p className="text-[15px]">
                  Faktura <strong>{invoice.number}</strong>, {price(invoice.totalRsd)} ·{" "}
                  {invoice.paidAt ? <Badge tone="accent">Plaćena {day.format(invoice.paidAt)}</Badge> : <Badge tone="muted">Nije plaćena</Badge>}
                </p>
              )}
              {(!invoice || notOnInvoice > 0) && (
                <form action={issueInvoiceAction.bind(null, company.id, month)}>
                  <button type="submit" className="h-11 caps-cta bg-cta px-5 text-on-cta hover:bg-cta-strong">
                    {invoice ? `Dodaj ${notOnInvoice} nove porudžbine na fakturu` : "Izdaj fakturu za mesec"}
                  </button>
                </form>
              )}
              {invoice && (
                <form action={invoicePaidAction.bind(null, invoice.id, !invoice.paidAt)}>
                  <button type="submit" className="h-11 caps border border-ink px-5 hover:bg-surface">
                    {invoice.paidAt ? "Poništi uplatu" : "Označi plaćeno"}
                  </button>
                </form>
              )}
              <a href={`/api/admin/firme/${company.id}/csv?mesec=${month}`} className="text-[15px] underline underline-offset-4">
                Preuzmi CSV za knjigovođu
              </a>
            </div>

            <h3 className="caps text-[13px] text-muted">Po zaposlenom</h3>
            <Table head={["Zaposleni", "Porudžbina", "Ukupno"]}>
              {overview.byEmployee.map((e) => (
                <tr key={e.email}>
                  <Cell>
                    {e.name}
                    <span className="block text-muted">{e.email}</span>
                  </Cell>
                  <Cell className="tabular-nums">{e.orders}</Cell>
                  <Cell className="tabular-nums">{price(e.totalRsd)}</Cell>
                </tr>
              ))}
            </Table>

            <h3 className="caps text-[13px] text-muted">Sve porudžbine</h3>
            <Table head={["Porudžbina", "Napravljena", "Termin", "Poručio", "Restorani", "Iznos"]}>
              {overview.orders.map((order) => (
                <tr key={order.id}>
                  <Cell>
                    <Link href={`/admin/porudzbine/${order.publicCode}`} className="font-medium underline underline-offset-4">
                      {order.publicCode}
                    </Link>
                  </Cell>
                  <Cell>{day.format(order.createdAt)}</Cell>
                  <Cell>
                    {formatDate(order.deliveryDate.toISOString().slice(0, 10), "sr")}, {slotLabel(order.slotHour)}
                  </Cell>
                  <Cell>{order.customerName}</Cell>
                  <Cell>{order.bills.map((bill) => bill.sellerName).join(", ")}</Cell>
                  <Cell className="tabular-nums">{price(order.totalRsd)}</Cell>
                </tr>
              ))}
            </Table>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <h2 className="caps-title text-base">Podaci firme</h2>
        <CompanyForm company={company} defaultFee={settings.settings.companyFeePercent} />
      </section>

      {company.invoices.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-ink pt-6">
          <h2 className="caps-title text-base">Sve fakture</h2>
          <Table head={["Broj", "Mesec", "Iznos", "Izdata", "Plaćena"]}>
            {company.invoices.map((i) => (
              <tr key={i.id}>
                <Cell className="font-medium">{i.number}</Cell>
                <Cell>
                  <Link href={`/admin/firme/${company.id}?mesec=${i.month}`} className="underline underline-offset-4">
                    {i.month}
                  </Link>
                </Cell>
                <Cell className="tabular-nums">{price(i.totalRsd)}</Cell>
                <Cell>{day.format(i.issuedAt)}</Cell>
                <Cell>{i.paidAt ? day.format(i.paidAt) : <Badge tone="muted">Ne</Badge>}</Cell>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </AdminPage>
  );
}
