import "server-only";
import { randomInt } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "./admin";
import type { SaveResult } from "./admin-catalog";
import { isMonth, monthOf } from "./admin-promo";
import { prisma } from "./db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const text = (form: FormData, name: string, max = 300) => String(form.get(name) ?? "").trim().slice(0, max);

// No 0/O or 1/I, so the code reads back over the phone.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const newOrderCode = () => `FIRMA-${Array.from({ length: 5 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")}`;

/** A UTC range safely around a Belgrade month; rows are then filtered by monthOf. */
function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(year, m - 1, 1) - 86_400_000), lt: new Date(Date.UTC(year, m, 1) + 86_400_000) };
}

export async function listCompanies() {
  await requireAdmin();
  return prisma.company.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { members: true, orders: true } } },
  });
}

export async function getCompany(id: string) {
  await requireAdmin();
  return prisma.company.findUnique({
    where: { id },
    include: { members: { orderBy: { email: "asc" } }, invoices: { orderBy: { month: "desc" } } },
  });
}

/** Creates or updates a company; the member list is replaced by the emails in the textarea, one per line. */
export async function saveCompany(existingId: string | null, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const name = text(form, "name", 200);
  const pib = text(form, "pib", 9);
  const mb = text(form, "mb", 8);
  const address = text(form, "address", 300);
  const billingEmail = text(form, "billingEmail", 200).toLowerCase();
  const emailDomain = text(form, "emailDomain", 100).toLowerCase().replace(/^@/, "") || null;
  const feeText = text(form, "feePercent", 5);
  const feePercent = feeText === "" ? null : Number(feeText);
  const members = [
    ...new Set(
      text(form, "members", 20_000)
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (name.length < 2) return { ok: false, error: "Upiši naziv firme." };
  if (!/^\d{9}$/.test(pib)) return { ok: false, error: "PIB ima 9 cifara." };
  if (!/^\d{8}$/.test(mb)) return { ok: false, error: "Matični broj ima 8 cifara." };
  if (address.length < 4) return { ok: false, error: "Upiši adresu firme za fakturu." };
  if (!EMAIL.test(billingEmail)) return { ok: false, error: "Email za fakture nije ispravan." };
  if (emailDomain && !DOMAIN.test(emailDomain)) return { ok: false, error: "Domen piši kao firma.rs, bez @ i bez https." };
  if (feePercent !== null && !(Number.isInteger(feePercent) && feePercent >= 0 && feePercent <= 100)) {
    return { ok: false, error: "Procenat je ceo broj od 0 do 100, ili prazno za podrazumevani." };
  }
  const bad = members.find((email) => !EMAIL.test(email));
  if (bad) return { ok: false, error: `Email zaposlenog nije ispravan: ${bad}` };
  if (!emailDomain && members.length === 0) {
    return { ok: false, error: "Upiši domen firme ili bar jedan email zaposlenog, inače niko ne može da poruči." };
  }

  const data = { name, pib, mb, address, billingEmail, emailDomain, feePercent, isActive: form.get("isActive") === "on" };
  for (let attempt = 0; ; attempt++) {
    try {
      const saved = await prisma.$transaction(async (tx) => {
        const company = existingId
          ? await tx.company.update({ where: { id: existingId }, data })
          : await tx.company.create({ data: { ...data, orderCode: newOrderCode() } });
        await tx.companyMember.deleteMany({ where: { companyId: company.id, email: { notIn: members } } });
        await tx.companyMember.createMany({ data: members.map((email) => ({ companyId: company.id, email })), skipDuplicates: true });
        return company;
      });
      return { ok: true, id: saved.id };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const target = String(error.meta?.target ?? "");
      if (target.includes("pib")) return { ok: false, error: `Firma sa PIB-om ${pib} već postoji.` };
      // A clash on the new order code: try another.
      if (existingId || attempt >= 4) throw error;
    }
  }
}

/** A new code, e.g. when the old one leaked; employees need the new one from then on. */
export async function newCompanyCode(id: string) {
  await requireAdmin();
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.company.update({ where: { id }, data: { orderCode: newOrderCode() } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") || attempt >= 4) throw error;
    }
  }
}

/** A company's orders on invoice in a month, by the Belgrade date they were placed, with the sums to charge. */
export async function companyMonth(companyId: string, month: string) {
  await requireAdmin();
  const orders = (
    await prisma.order.findMany({
      where: { companyId, status: "on_invoice", createdAt: monthRange(month) },
      orderBy: { createdAt: "asc" },
      include: { bills: { select: { subtotalRsd: true, deliveryFeeRsd: true, platformFeeRsd: true, sellerName: true } } },
    })
  ).filter((order) => monthOf(order.createdAt) === month);

  const sum = (pick: (bill: (typeof orders)[number]["bills"][number]) => number) =>
    orders.reduce((total, order) => total + order.bills.reduce((s, bill) => s + pick(bill), 0), 0);
  const totals = {
    subtotalRsd: sum((bill) => bill.subtotalRsd),
    deliveryRsd: sum((bill) => bill.deliveryFeeRsd),
    feeRsd: sum((bill) => bill.platformFeeRsd),
    totalRsd: orders.reduce((total, order) => total + order.totalRsd, 0),
  };
  const byEmployee = new Map<string, { email: string; name: string; orders: number; totalRsd: number }>();
  for (const order of orders) {
    const entry = byEmployee.get(order.email) ?? { email: order.email, name: order.customerName, orders: 0, totalRsd: 0 };
    entry.orders += 1;
    entry.totalRsd += order.totalRsd;
    byEmployee.set(order.email, entry);
  }
  return { orders, totals, byEmployee: [...byEmployee.values()].sort((a, b) => b.totalRsd - a.totalRsd) };
}

/**
 * Issues the month's invoice: one row with the sums, every order of the month linked to it.
 * Orders placed later in an already invoiced month are added to that invoice when it is issued again.
 */
export async function issueCompanyInvoice(companyId: string, month: string) {
  await requireAdmin();
  if (!isMonth(month)) return;
  const { orders, totals } = await companyMonth(companyId, month);
  if (orders.length === 0) return;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.companyInvoice.findUnique({ where: { companyId_month: { companyId, month } } });
    // Numbered per month across all companies: SRV-F-2026-11-001, -002, …
    const number = existing?.number ?? `SRV-F-${month}-${String((await tx.companyInvoice.count({ where: { month } })) + 1).padStart(3, "0")}`;
    const invoice = await tx.companyInvoice.upsert({
      where: { companyId_month: { companyId, month } },
      create: { companyId, month, number, ...totals },
      update: { ...totals, issuedAt: new Date() },
    });
    await tx.order.updateMany({ where: { id: { in: orders.map((order) => order.id) } }, data: { companyInvoiceId: invoice.id } });
  });
}

export async function setCompanyInvoicePaid(invoiceId: string, paid: boolean) {
  await requireAdmin();
  await prisma.companyInvoice.update({ where: { id: invoiceId }, data: { paidAt: paid ? new Date() : null } });
}
