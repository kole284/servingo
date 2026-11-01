import "server-only";
import type { Prisma, Unit } from "@/generated/prisma/client";
import { requireAdmin } from "./admin";
import { nextBillStatus } from "./bills";
import { prisma } from "./db";

export type OrderFilter = { date?: string; status?: string };

const isDate = (value: string | undefined): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Status as the customer sees it: an unpaid order past its window counts as cancelled. */
function statusWhere(status: string | undefined): Prisma.OrderWhereInput {
  const now = new Date();
  switch (status) {
    case "pending_payment":
    case "payment_failed":
      return { status, expiresAt: { gt: now } };
    case "cancelled":
      return { OR: [{ status: "cancelled" }, { status: { in: ["pending_payment", "payment_failed"] }, expiresAt: { lte: now } }] };
    case "paid":
    case "refunded":
      return { status };
    default:
      return {};
  }
}

export async function listOrders(filter: OrderFilter) {
  await requireAdmin();
  return prisma.order.findMany({
    where: { ...statusWhere(filter.status), ...(isDate(filter.date) ? { deliveryDate: new Date(`${filter.date}T00:00:00Z`) } : {}) },
    orderBy: isDate(filter.date) ? [{ slotHour: "asc" }, { createdAt: "asc" }] : { createdAt: "desc" },
    take: 200,
    include: {
      bills: {
        select: { id: true, sellerName: true, status: true, fulfilment: true },
        orderBy: [{ createdAt: "asc" }, { restaurantId: { sort: "asc", nulls: "last" } }],
      },
    },
  });
}

export async function getOrderForAdmin(code: string) {
  await requireAdmin();
  return prisma.order.findUnique({
    where: { publicCode: code },
    include: {
      bills: {
        orderBy: [{ createdAt: "asc" }, { restaurantId: { sort: "asc", nulls: "last" } }],
        include: { items: { orderBy: { sortOrder: "asc" } }, restaurant: { select: { pickupAddress: true, city: true, phone: true } } },
      },
      payments: { orderBy: { createdAt: "asc" } },
      notifications: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Moves a paid order's bill one step on, like the restaurant's own link does. */
export async function advanceBillAsAdmin(billId: string, from: Prisma.BillGetPayload<object>["status"]) {
  await requireAdmin();
  const bill = await prisma.bill.findUnique({ where: { id: billId }, include: { order: { select: { status: true } } } });
  if (!bill || bill.order.status !== "paid" || bill.status !== from) return;
  const next = nextBillStatus(bill);
  if (next) await prisma.bill.updateMany({ where: { id: billId, status: from }, data: { status: next } });
}

/**
 * Drinks Servingo has to buy for one delivery day: totals per drink, and which bill each goes on.
 * Only paid orders count.
 */
export async function drinksForDay(date: string) {
  await requireAdmin();
  if (!isDate(date)) return { totals: [], bills: [] };
  const bills = await prisma.bill.findMany({
    where: { hasDrinks: true, status: { not: "cancelled" }, order: { status: "paid", deliveryDate: new Date(`${date}T00:00:00Z`) } },
    orderBy: [{ order: { slotHour: "asc" } }, { createdAt: "asc" }],
    include: {
      items: { where: { isDrink: true }, orderBy: { sortOrder: "asc" } },
      order: { select: { publicCode: true, slotHour: true, address: true, city: true, customerName: true, phone: true } },
      restaurant: { select: { pickupAddress: true, city: true } },
    },
  });

  const totals = new Map<string, { name: string; unitNote: string | null; unit: Unit; tenths: number }>();
  for (const item of bills.flatMap((bill) => bill.items)) {
    const key = item.menuItemId ?? `${item.name}|${item.unitNote}`;
    const total = totals.get(key) ?? { name: item.name, unitNote: item.unitNote, unit: item.unit, tenths: 0 };
    total.tenths += item.quantityTenths;
    totals.set(key, total);
  }
  return { totals: [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, "sr")), bills };
}
