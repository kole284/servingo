import type { ReactNode } from "react";
import Link from "next/link";

/** Title row with optional actions on the right, then the page body. */
export function AdminPage({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="caps-title text-xl md:text-2xl">{title}</h1>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ButtonLink({ href, children, primary }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center px-5 ${primary ? "caps-cta bg-cta text-on-cta hover:bg-cta-strong" : "caps border border-ink hover:bg-surface"}`}
    >
      {children}
    </Link>
  );
}

/** Scrolls sideways on small screens instead of squeezing columns. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="bg-surface text-[12px] text-muted uppercase">
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="px-4 py-3 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const Cell = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`px-4 py-3 align-top ${className}`}>{children}</td>
);

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "muted" }) {
  const colors = { neutral: "bg-surface", accent: "bg-accent-soft text-ink", muted: "bg-bg text-muted border border-line" }[tone];
  return <span className={`inline-block px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${colors}`}>{children}</span>;
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="border border-line px-5 py-10 text-center text-[15px] text-muted">{children}</p>
);

export const ORDER_STATUS = {
  pending_payment: "Čeka uplatu",
  paid: "Plaćena",
  payment_failed: "Plaćanje nije uspelo",
  cancelled: "Otkazana",
  refunded: "Novac vraćen",
} as const;

export const BILL_STATUS = {
  new: "Nova",
  confirmed: "Potvrđena",
  ready: "Spremna",
  delivered: "Isporučena",
  picked_up: "Preuzeta",
  cancelled: "Otkazana",
} as const;

export const SERVICE_LABEL = {
  ketering: "Ketering",
  torte_i_kolaci: "Torte i kolači",
  kuvana_jela: "Kuvana jela",
  pica: "Pića",
} as const;

export const UNIT_LABEL = { kg: "kg", kom: "kom", porcija: "porcija", paket: "paket" } as const;
