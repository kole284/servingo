import { companyMonth, getCompany } from "@/server/admin-companies";
import { isMonth, monthOf } from "@/server/admin-promo";

/** Quotes a value for CSV; leading = + - @ are escaped so a spreadsheet never runs it as a formula. */
const cell = (value: string | number) => {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** One line per bill of the company's month, for the accountant. Admins only (checked in companyMonth). */
export async function GET(request: Request, { params }: RouteContext<"/api/admin/firme/[id]/csv">) {
  const { id } = await params;
  const asked = new URL(request.url).searchParams.get("mesec") ?? undefined;
  const month = isMonth(asked) ? asked : monthOf(new Date());
  const [company, { orders }] = await Promise.all([getCompany(id), companyMonth(id, month)]);
  if (!company) return new Response("Not found", { status: 404 });

  const rows = [
    ["Porudžbina", "Datum", "Termin", "Zaposleni", "Email", "Prodavac", "Jela i pića", "Dostava", "Usluga platforme", "Ukupno računa"],
    ...orders.flatMap((order) =>
      order.bills.map((bill) => [
        order.publicCode,
        order.createdAt.toISOString().slice(0, 10),
        `${order.deliveryDate.toISOString().slice(0, 10)} ${order.slotHour}:00`,
        order.customerName,
        order.email,
        bill.sellerName,
        bill.subtotalRsd,
        bill.deliveryFeeRsd,
        bill.platformFeeRsd,
        bill.subtotalRsd + bill.deliveryFeeRsd + bill.platformFeeRsd,
      ]),
    ),
  ];
  // BOM so Excel opens the Serbian letters correctly; semicolons for Serbian-locale Excel.
  const body = "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
  const file = `${company.name.replace(/[^\p{L}\p{N}]+/gu, "-")}-${month}.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="firma-${month}.csv"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "no-store",
    },
  });
}
