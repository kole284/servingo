import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionaryFor } from "@/i18n/server";
import { formatPrice } from "@/lib/menu";
import { getPromoCode } from "@/server/admin-promo";
import { AdminPage, Badge, Cell, Empty, Table } from "../../../ui";
import { PromoForm } from "../promo-form";

const t = dictionaryFor("sr");
const price = (amount: number) => formatPrice(amount, "sr", t);
const when = new Intl.DateTimeFormat("sr-Latn-RS", { timeZone: "Europe/Belgrade", dateStyle: "medium", timeStyle: "short" });
const percent = (tenths: number) => `${String(tenths / 10).replace(".", ",")} %`;

export default async function PromoCodePage({ params }: PageProps<"/admin/promo/[id]">) {
  const promo = await getPromoCode((await params).id);
  if (!promo) notFound();

  return (
    <AdminPage title={`Promo kod ${promo.code}`}>
      <PromoForm promo={promo} />

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <h2 className="caps-title text-base">Korišćenja (plaćene porudžbine)</h2>
        {promo.redemptions.length === 0 ? (
          <Empty>Kod još nije iskorišćen.</Empty>
        ) : (
          <Table head={["Plaćeno", "Porudžbina", "Kupac platio", "Osnovica", "Provizija", "Isplata"]}>
            {promo.redemptions.map((r) => (
              <tr key={r.id}>
                <Cell>{when.format(r.usedAt)}</Cell>
                <Cell>
                  <Link href={`/admin/porudzbine/${r.order.publicCode}`} className="font-medium underline underline-offset-4">
                    {r.order.publicCode}
                  </Link>
                </Cell>
                <Cell className="tabular-nums">
                  {price(r.order.totalRsd)}
                  {r.order.originalTotalRsd && <s className="block text-muted">{price(r.order.originalTotalRsd)}</s>}
                </Cell>
                <Cell className="tabular-nums">{price(r.baseRsd)}</Cell>
                <Cell className="tabular-nums">
                  {price(r.commissionRsd)} <span className="text-muted">({percent(r.commissionTenths)})</span>
                </Cell>
                <Cell>{r.payout ? <Badge tone="accent">{r.payout.month}</Badge> : <Badge tone="muted">Nije isplaćeno</Badge>}</Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>

      {promo.payouts.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-ink pt-6">
          <h2 className="caps-title text-base">Isplate</h2>
          <Table head={["Mesec", "Iznos", "Isplaćeno"]}>
            {promo.payouts.map((p) => (
              <tr key={p.id}>
                <Cell>
                  <Link href={`/admin/promo?mesec=${p.month}`} className="underline underline-offset-4">
                    {p.month}
                  </Link>
                </Cell>
                <Cell className="tabular-nums">{price(p.amountRsd)}</Cell>
                <Cell>{when.format(p.paidAt)}</Cell>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </AdminPage>
  );
}
