import { notFound } from "next/navigation";
import { getMenuItemForAdmin } from "@/server/admin-catalog";
import { AdminPage } from "../../../ui";
import { ItemForm } from "../item-form";

export default async function ItemPage({ params }: PageProps<"/admin/stavke/[id]">) {
  const item = await getMenuItemForAdmin((await params).id);
  if (!item) notFound();
  const restaurant = item.restaurant && { id: item.restaurant.id, services: item.restaurant.services.map((s) => s.service) };
  return (
    <AdminPage title={item.restaurant ? `${item.name} · ${item.restaurant.name}` : `${item.name} · piće`}>
      <ItemForm item={item} restaurant={restaurant} />
    </AdminPage>
  );
}
