import { notFound } from "next/navigation";
import { getRestaurantForAdmin } from "@/server/admin-catalog";
import { AdminPage } from "../../../ui";
import { ItemForm } from "../item-form";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** ?restoran=<id> adds a dish to that restaurant; ?restoran=pica adds a Servingo drink. */
export default async function NewItemPage({ searchParams }: PageProps<"/admin/stavke/nova">) {
  const target = first((await searchParams).restoran);
  if (target === "pica") {
    return (
      <AdminPage title="Novo piće">
        <ItemForm restaurant={null} />
      </AdminPage>
    );
  }
  const restaurant = target ? await getRestaurantForAdmin(target) : null;
  if (!restaurant) notFound();
  return (
    <AdminPage title={`Nova stavka: ${restaurant.name}`}>
      <ItemForm restaurant={{ id: restaurant.id, services: restaurant.services.map((s) => s.service) }} />
    </AdminPage>
  );
}
