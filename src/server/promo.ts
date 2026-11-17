import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { commission } from "@/lib/pricing";
import { prisma } from "./db";

/** Codes are stored in capitals without spaces, so "servingo 10 " and "SERVINGO10" are the same code. */
export const normalizeCode = (raw: string | undefined) => (raw ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 40);

export type PromoCheck =
  | { ok: true; promo: { id: string; code: string; commissionTenths: number }; percent: number }
  | { ok: false; reason: "promo_invalid" | "promo_expired" };

/** Whether a code can be used right now, and the discount it gives. */
export async function findPromo(raw: string | undefined): Promise<PromoCheck> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, reason: "promo_invalid" };
  const [promo, settings] = await Promise.all([
    prisma.promoCode.findUnique({ where: { code }, select: { id: true, code: true, commissionTenths: true, isActive: true, expiresAt: true } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 }, select: { promoDiscountPercent: true } }),
  ]);
  if (!promo || !promo.isActive) return { ok: false, reason: "promo_invalid" };
  if (promo.expiresAt && promo.expiresAt <= new Date()) return { ok: false, reason: "promo_expired" };
  return { ok: true, promo, percent: settings.promoDiscountPercent };
}

/**
 * Records what the partner earned on a paid order. Runs inside the transaction that marks the order paid,
 * so an order is counted once, and never while it is unpaid.
 */
export async function recordRedemption(
  tx: Prisma.TransactionClient,
  order: { id: string; promoCodeId: string | null; bills: { subtotalRsd: number; discountRsd: number }[] },
) {
  if (!order.promoCodeId) return;
  const promo = await tx.promoCode.findUniqueOrThrow({ where: { id: order.promoCodeId }, select: { commissionTenths: true } });
  const baseRsd = order.bills.reduce((sum, bill) => sum + bill.subtotalRsd - bill.discountRsd, 0);
  await tx.promoRedemption.upsert({
    where: { orderId: order.id },
    create: {
      promoCodeId: order.promoCodeId,
      orderId: order.id,
      baseRsd,
      commissionTenths: promo.commissionTenths,
      commissionRsd: commission(baseRsd, promo.commissionTenths),
    },
    update: {},
  });
}
