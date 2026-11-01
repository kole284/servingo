import Link from "next/link";
import { dictionaryFor } from "@/i18n/server";
import { formatPrice } from "@/lib/menu";
import { listDrinksForAdmin } from "@/server/admin-catalog";
import { AdminPage, Badge, ButtonLink, Cell, Empty, Table, UNIT_LABEL } from "../../ui";

const t = dictionaryFor("sr");

export default async function DrinksPage() {
  const drinks = await listDrinksForAdmin();
  return (
    <AdminPage title="Ponuda pića" actions={<ButtonLink href="/admin/stavke/nova?restoran=pica" primary>Dodaj piće</ButtonLink>}>
      <p className="max-w-2xl text-[15px] text-muted">Servingova pića se nude u svakom restoranu i na strani Pića. Servingo ih nabavlja.</p>
      {drinks.length === 0 ? (
        <Empty>Još nema pića.</Empty>
      ) : (
        <Table head={["Piće", "Cena", "Stanje"]}>
          {drinks.map((item) => (
            <tr key={item.id}>
              <Cell>
                <Link href={`/admin/stavke/${item.id}`} className="font-medium underline underline-offset-4">
                  {item.name}
                </Link>
              </Cell>
              <Cell className="tabular-nums">
                {formatPrice(item.priceRsd, "sr", t)} / {item.unitNote ?? UNIT_LABEL[item.unit]}
              </Cell>
              <Cell>{item.isActive ? <Badge tone="accent">U ponudi</Badge> : <Badge tone="muted">Isključeno</Badge>}</Cell>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
