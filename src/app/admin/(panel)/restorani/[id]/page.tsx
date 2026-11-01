import Link from "next/link";
import { notFound } from "next/navigation";
import { dictionaryFor } from "@/i18n/server";
import { formatPrice } from "@/lib/menu";
import { getRestaurantForAdmin } from "@/server/admin-catalog";
import { AdminPage, Badge, ButtonLink, Cell, Empty, SERVICE_LABEL, Table, UNIT_LABEL } from "../../../ui";
import { RestaurantForm } from "../restaurant-form";

const t = dictionaryFor("sr");

export default async function RestaurantPage({ params }: PageProps<"/admin/restorani/[id]">) {
  const restaurant = await getRestaurantForAdmin((await params).id);
  if (!restaurant) notFound();

  return (
    <AdminPage
      title={restaurant.name}
      actions={
        <Link href={`/sr/restorani/${restaurant.id}`} className="inline-flex h-11 items-center caps border border-ink px-5 hover:bg-surface">
          Na sajtu
        </Link>
      }
    >
      <RestaurantForm restaurant={restaurant} />

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="caps-title text-base">Meni</h2>
          <ButtonLink href={`/admin/stavke/nova?restoran=${restaurant.id}`} primary>
            Dodaj stavku
          </ButtonLink>
        </div>
        {restaurant.menuItems.length === 0 ? (
          <Empty>Meni je prazan.</Empty>
        ) : (
          <Table head={["Stavka", "Usluga", "Cena", "Stanje"]}>
            {restaurant.menuItems.map((item) => (
              <tr key={item.id}>
                <Cell>
                  <Link href={`/admin/stavke/${item.id}`} className="font-medium underline underline-offset-4">
                    {item.name}
                  </Link>
                  {item.isPopular && <span className="text-muted"> · najprodavanije</span>}
                </Cell>
                <Cell>{SERVICE_LABEL[item.service]}</Cell>
                <Cell className="tabular-nums">
                  {formatPrice(item.priceRsd, "sr", t)} / {item.unitNote ?? UNIT_LABEL[item.unit]}
                </Cell>
                <Cell>{item.isActive ? <Badge tone="accent">U ponudi</Badge> : <Badge tone="muted">Isključeno</Badge>}</Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </AdminPage>
  );
}
