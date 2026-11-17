import Link from "next/link";
import { listCompanies } from "@/server/admin-companies";
import { AdminPage, Badge, ButtonLink, Cell, Empty, Table } from "../../ui";

export default async function CompaniesPage() {
  const companies = await listCompanies();
  return (
    <AdminPage title="Firme na fakturu" actions={<ButtonLink href="/admin/firme/nova" primary>Nova firma</ButtonLink>}>
      {companies.length === 0 ? (
        <Empty>Još nema firmi.</Empty>
      ) : (
        <Table head={["Firma", "Kod za porudžbine", "Ko poručuje", "Porudžbina", "Stanje"]}>
          {companies.map((c) => (
            <tr key={c.id}>
              <Cell>
                <Link href={`/admin/firme/${c.id}`} className="font-medium underline underline-offset-4">
                  {c.name}
                </Link>
                <span className="block text-muted">PIB {c.pib}</span>
              </Cell>
              <Cell className="font-mono">{c.orderCode}</Cell>
              <Cell>
                {[c.emailDomain && `@${c.emailDomain}`, c._count.members > 0 && `${c._count.members} sa liste`].filter(Boolean).join(", ")}
              </Cell>
              <Cell className="tabular-nums">{c._count.orders}</Cell>
              <Cell>{c.isActive ? <Badge tone="accent">Aktivna</Badge> : <Badge tone="muted">Isključena</Badge>}</Cell>
            </tr>
          ))}
        </Table>
      )}
    </AdminPage>
  );
}
