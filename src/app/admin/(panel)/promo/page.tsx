import Link from "next/link";
import { dictionaryFor } from "@/i18n/server";
import { formatPrice } from "@/lib/menu";
import { isMonth, listPromoCodes, monthOf, promoMonth } from "@/server/admin-promo";
import { AdminPage, Badge, ButtonLink, Cell, Empty, Table } from "../../ui";
import { markPaidAction } from "./actions";

const t = dictionaryFor("sr");
const price = (amount: number) => formatPrice(amount, "sr", t);
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const percent = (tenths: number) => `${String(tenths / 10).replace(".", ",")} %`;

export default async function PromoPage({ searchParams }: PageProps<"/admin/promo">) {
  const asked = first((await searchParams).mesec);
  const month = isMonth(asked) ? asked : monthOf(new Date());
  const [codes, earnings] = await Promise.all([listPromoCodes(month), promoMonth(month)]);
  const owed = earnings.reduce((sum, row) => sum + row.unpaidRsd, 0);

  return (
    <AdminPage title="Promo kodovi" actions={<ButtonLink href="/admin/promo/novi" primary>Novi kod</ButtonLink>}>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="caps-title text-base">Obračun za mesec</h2>
          {/* A plain GET form, so a month's statement has its own address. */}
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
        {earnings.length === 0 ? (
          <Empty>U ovom mesecu nije plaćena nijedna porudžbina sa promo kodom.</Empty>
        ) : (
          <>
            <p className="text-[15px]">
              Za isplatu: <strong className="tabular-nums">{price(owed)}</strong>
            </p>
            <Table head={["Kod", "Vlasnik", "Porudžbina", "Osnovica", "Provizija", "Isplata"]}>
              {earnings.map((row) => (
                <tr key={row.promo.id}>
                  <Cell>
                    <Link href={`/admin/promo/${row.promo.id}`} className="font-medium underline underline-offset-4">
                      {row.promo.code}
                    </Link>
                  </Cell>
                  <Cell>
                    {row.promo.ownerName}
                    <span className="block text-muted">{[row.promo.ownerEmail, row.promo.ownerPhone].filter(Boolean).join(", ")}</span>
                  </Cell>
                  <Cell className="tabular-nums">{row.orders}</Cell>
                  <Cell className="tabular-nums">{price(row.baseRsd)}</Cell>
                  <Cell className="tabular-nums font-medium">{price(row.commissionRsd)}</Cell>
                  <Cell>
                    {row.unpaidRsd === 0 ? (
                      <Badge tone="accent">Isplaćeno</Badge>
                    ) : (
                      <form action={markPaidAction.bind(null, row.promo.id, month)}>
                        <button type="submit" className="caps border border-ink px-3 py-1.5 text-[12px] hover:bg-surface">
                          Označi isplaćeno ({price(row.unpaidRsd)})
                        </button>
                      </form>
                    )}
                  </Cell>
                </tr>
              ))}
            </Table>
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <h2 className="caps-title text-base">Svi kodovi</h2>
        {codes.length === 0 ? (
          <Empty>Još nema promo kodova.</Empty>
        ) : (
          <Table head={["Kod", "Vlasnik", "Provizija", "Korišćen", "Ovog meseca", "Stanje"]}>
            {codes.map((code) => {
              const expired = code.expiresAt !== null && code.expiresAt <= new Date();
              return (
                <tr key={code.id}>
                  <Cell>
                    <Link href={`/admin/promo/${code.id}`} className="font-medium underline underline-offset-4">
                      {code.code}
                    </Link>
                  </Cell>
                  <Cell>{code.ownerName}</Cell>
                  <Cell className="tabular-nums">{percent(code.commissionTenths)}</Cell>
                  <Cell className="tabular-nums">{code._count.redemptions}×</Cell>
                  <Cell className="tabular-nums">{price(code.monthCommission)}</Cell>
                  <Cell>
                    {!code.isActive ? (
                      <Badge tone="muted">Isključen</Badge>
                    ) : expired ? (
                      <Badge tone="muted">Istekao</Badge>
                    ) : (
                      <Badge tone="accent">Aktivan</Badge>
                    )}
                  </Cell>
                </tr>
              );
            })}
          </Table>
        )}
      </section>
    </AdminPage>
  );
}
