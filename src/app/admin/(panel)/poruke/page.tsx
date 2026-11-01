import { APPLICATION_STATUSES, listInbox } from "@/server/admin-settings";
import { AdminPage, Badge, Empty } from "../../ui";
import { setStatusAction } from "./actions";

const KIND = { restoran: "Restoran", poslasticarnica: "Poslastičarnica", vinoteka: "Vinoteka", drugo: "Drugo" } as const;
const STATUS = { new: "Nova", contacted: "Javili smo se", accepted: "Prihvaćena", rejected: "Odbijena" } as const;
const dateTime = (date: Date) =>
  new Intl.DateTimeFormat("sr-Latn-RS", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Belgrade" }).format(date);

export default async function InboxPage() {
  const { messages, applications } = await listInbox();
  return (
    <AdminPage title="Poruke i prijave">
      <section className="flex flex-col gap-4">
        <h2 className="caps-title text-base">Prijave za saradnju</h2>
        {applications.length === 0 ? (
          <Empty>Još nema prijava.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {applications.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 border border-line p-5 md:flex-row md:justify-between">
                <div className="flex min-w-0 flex-col gap-1 text-[15px]">
                  <p className="text-lg font-medium">
                    {a.businessName} <span className="text-[14px] font-normal text-muted">· {KIND[a.kind]}, {a.area}</span>
                  </p>
                  <p>
                    {a.contactName} · <a href={`tel:${a.phone}`} className="underline underline-offset-4">{a.phone}</a> ·{" "}
                    <a href={`mailto:${a.email}`} className="underline underline-offset-4">{a.email}</a>
                  </p>
                  {a.message && <p className="whitespace-pre-line text-muted">{a.message}</p>}
                  <p className="text-[13px] text-muted">{dateTime(a.createdAt)}</p>
                </div>
                <form action={setStatusAction.bind(null, a.id)} className="flex shrink-0 items-start gap-2">
                  <select name="status" defaultValue={a.status} aria-label="Status prijave" className="h-10 border border-line bg-bg px-3 text-[14px]">
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS[s]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="h-10 caps border border-ink px-3 hover:bg-surface">
                    Sačuvaj
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 border-t border-ink pt-6">
        <h2 className="caps-title text-base">Poruke sa strane Kontakt</h2>
        {messages.length === 0 ? (
          <Empty>Još nema poruka.</Empty>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 border border-line p-5 text-[15px]">
                <p className="font-medium">
                  {m.name} · <a href={`mailto:${m.email}`} className="underline underline-offset-4">{m.email}</a>
                  {m.phone && <span className="font-normal text-muted"> · {m.phone}</span>}
                  {m.orderCode && (
                    <span className="ml-2">
                      <Badge>{m.orderCode}</Badge>
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-line">{m.message}</p>
                <p className="text-[13px] text-muted">{dateTime(m.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPage>
  );
}
