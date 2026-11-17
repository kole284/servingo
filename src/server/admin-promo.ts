import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "./admin";
import { prisma } from "./db";
import { normalizeCode } from "./promo";
import type { SaveResult } from "./admin-catalog";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (form: FormData, name: string, max = 300) => String(form.get(name) ?? "").trim().slice(0, max);

/** "2026-11" for a moment, by the Belgrade calendar (a payment at 00:30 on 1 December counts for December). */
const MONTH = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit" });
export const monthOf = (date: Date) => MONTH.format(date).slice(0, 7);
export const isMonth = (value: string | undefined): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** A UTC range safely around a Belgrade month; rows are then filtered by monthOf. */
function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(year, m - 1, 1) - 86_400_000), lt: new Date(Date.UTC(year, m, 1) + 86_400_000) };
}

/** "5" or "2,5" percent, stored in tenths (50, 25). */
function percentTenths(form: FormData, name: string) {
  const value = Number(text(form, name).replace(",", "."));
  const tenths = Math.round(value * 10);
  return Number.isFinite(value) && Math.abs(value * 10 - tenths) < 1e-6 && tenths >= 0 && tenths <= 1000 ? tenths : null;
}

export async function listPromoCodes(month: string) {
  await requireAdmin();
  const [codes, redemptions] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: [{ isActive: "desc" }, { code: "asc" }], include: { _count: { select: { redemptions: true } } } }),
    prisma.promoRedemption.findMany({ where: { usedAt: monthRange(month) }, select: { promoCodeId: true, usedAt: true, commissionRsd: true } }),
  ]);
  const earned = new Map<string, number>();
  for (const r of redemptions) {
    if (monthOf(r.usedAt) === month) earned.set(r.promoCodeId, (earned.get(r.promoCodeId) ?? 0) + r.commissionRsd);
  }
  return codes.map((code) => ({ ...code, monthCommission: earned.get(code.id) ?? 0 }));
}

export async function getPromoCode(id: string) {
  await requireAdmin();
  return prisma.promoCode.findUnique({
    where: { id },
    include: {
      redemptions: {
        orderBy: { usedAt: "desc" },
        take: 200,
        include: { order: { select: { publicCode: true, totalRsd: true, originalTotalRsd: true } }, payout: { select: { month: true } } },
      },
      payouts: { orderBy: { month: "desc" } },
    },
  });
}

/** Creates or updates a partner's code. */
export async function savePromoCode(existingId: string | null, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const code = normalizeCode(text(form, "code", 40));
  const ownerName = text(form, "ownerName", 120);
  const ownerEmail = text(form, "ownerEmail", 200) || null;
  const ownerPhone = text(form, "ownerPhone", 40) || null;
  const commissionTenths = percentTenths(form, "commission");
  const expires = text(form, "expiresAt", 10);
  // The code works through the whole last day, Belgrade time.
  const expiresAt = expires ? new Date(`${expires}T23:59:59+01:00`) : null;

  if (!/^[A-Z0-9-]{3,40}$/.test(code)) return { ok: false, error: "Kod: 3 do 40 slova, brojeva ili crtica, bez razmaka." };
  if (ownerName.length < 2) return { ok: false, error: "Upiši ime vlasnika koda." };
  if (ownerEmail && !EMAIL.test(ownerEmail)) return { ok: false, error: "Email vlasnika nije ispravan." };
  if (commissionTenths === null) return { ok: false, error: "Provizija je procenat od 0 do 100, npr. 5 ili 2,5." };
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { ok: false, error: "Datum isteka nije ispravan." };

  const data = {
    code,
    ownerName,
    ownerEmail,
    ownerPhone,
    commissionTenths,
    expiresAt,
    isActive: form.get("isActive") === "on",
    note: text(form, "note", 500) || null,
  };
  try {
    const saved = existingId
      ? await prisma.promoCode.update({ where: { id: existingId }, data })
      : await prisma.promoCode.create({ data });
    return { ok: true, id: saved.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: `Kod ${code} već postoji.` };
    }
    throw error;
  }
}

/** Every code's earnings in a month: what to pay each partner, and whether it has been paid. */
export async function promoMonth(month: string) {
  await requireAdmin();
  const rows = await prisma.promoRedemption.findMany({
    where: { usedAt: monthRange(month) },
    include: { promo: { select: { id: true, code: true, ownerName: true, ownerEmail: true, ownerPhone: true } } },
  });
  const payouts = await prisma.promoPayout.findMany({ where: { month } });
  const paid = new Map(payouts.map((p) => [p.promoCodeId, p]));

  const byCode = new Map<string, { promo: (typeof rows)[number]["promo"]; orders: number; baseRsd: number; commissionRsd: number; unpaidRsd: number }>();
  for (const row of rows) {
    if (monthOf(row.usedAt) !== month) continue;
    const entry = byCode.get(row.promoCodeId) ?? { promo: row.promo, orders: 0, baseRsd: 0, commissionRsd: 0, unpaidRsd: 0 };
    entry.orders += 1;
    entry.baseRsd += row.baseRsd;
    entry.commissionRsd += row.commissionRsd;
    if (!row.payoutId) entry.unpaidRsd += row.commissionRsd;
    byCode.set(row.promoCodeId, entry);
  }
  return [...byCode.values()]
    .map((entry) => ({ ...entry, payout: paid.get(entry.promo.id) ?? null }))
    .sort((a, b) => b.commissionRsd - a.commissionRsd);
}

/** Marks a partner's month as paid: one payout row, and every earning of that month linked to it. */
export async function markPromoPaid(promoCodeId: string, month: string) {
  await requireAdmin();
  if (!isMonth(month)) return;
  await prisma.$transaction(async (tx) => {
    const rows = (
      await tx.promoRedemption.findMany({ where: { promoCodeId, usedAt: monthRange(month), payoutId: null } })
    ).filter((row) => monthOf(row.usedAt) === month);
    if (rows.length === 0) return;
    const amount = rows.reduce((sum, row) => sum + row.commissionRsd, 0);
    // A second payment in the same month (orders paid after the first payout) adds to the same row.
    const payout = await tx.promoPayout.upsert({
      where: { promoCodeId_month: { promoCodeId, month } },
      create: { promoCodeId, month, amountRsd: amount },
      update: { amountRsd: { increment: amount }, paidAt: new Date() },
    });
    await tx.promoRedemption.updateMany({ where: { id: { in: rows.map((row) => row.id) } }, data: { payoutId: payout.id } });
  });
}
