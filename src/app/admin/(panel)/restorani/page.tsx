import Link from "next/link";
import { listRestaurantsForAdmin } from "@/server/admin-catalog";
import { AdminPage, Badge, ButtonLink, Cell, Empty, SERVICE_LABEL, Table } from "../../ui";

export default async function RestaurantsPage() {
  const restaurants = await listRestaurantsForAdmin();
  return (
    <AdminPage title="Restorani" actions={<ButtonLink href="/admin/restorani/novi" primary>Novi restoran</ButtonLink>}>
      {restaurants.length === 0 ? (
        <Empty>Još nema restorana.</Empty>
      ) : (
        <Table head={["Restoran", "Usluge", "Rok", "Stavki u ponudi", "Na sajtu"]}>
          {restaurants.map((r) => (
            <tr key={r.id}>
              <Cell>
                <Link href={`/admin/restorani/${r.id}`} className="font-medium underline underline-offset-4">
                  {r.name}
                </Link>
                <span className="block text-muted">{r.area}</span>
              </Cell>
              <Cell>{r.services.map((s) => SERVICE_LABEL[s.service]).join(", ")}</Cell>
              <Cell>{r.leadTimeHours} h</Cell>
              <Cell>{r._count.menuItems}</Cell>
              <Cell>{r.isActive ? <Badge tone="accent">Da</Badge> : <Badge tone="muted">Ne</Badge>}</Cell>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
