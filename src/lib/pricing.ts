import type { Method } from "./booking";
import { SERVINGO_DRINKS, isDrink, type MenuItem } from "./menu";

/**
 * Bill rules shared by the cart (for display) and the server (for the amount actually charged).
 * Pure: no database, no browser.
 */

export type Fees = { deliveryFee: number; platformFee: number; deliveryMinimum: number };

/**
 * A special price for the whole order:
 * - promo: a partner's code takes a percentage off the items, and delivery and the platform fee are free;
 * - company: a company on monthly invoice pays a percentage of the items instead of the flat platform fee.
 */
export type Deal = { kind: "promo"; code: string; percent: number } | { kind: "company"; feePercent: number };

/** Whose bill a line goes on: a restaurant, or Servingo for drinks ordered on their own. */
export type Seller = { id: string; name: string };

export const SERVINGO_SELLER: Seller = { id: SERVINGO_DRINKS, name: "Servingo" };

export type PricedLineInput = {
  item: Pick<MenuItem, "price" | "restaurantId">;
  quantity: number;
  /** The restaurant a dish comes from; drinks always go on Servingo's bill whatever this says. */
  restaurantId: string;
  restaurantName: string;
};

export type PickupReason = "chosen" | "city" | "minimum";

/** Rounded per line, so a bill is the sum of what its lines show (0,5 kg × 3.333 din = 1.667 din). */
export const lineTotal = (price: number, quantity: number) => Math.round(price * quantity);

/**
 * How many dinars a promo code takes off one bill's items (whole dinars, never more than the items).
 * Worked out per bill, so each bill shows its own discount and the order's discount is their sum.
 */
export function promoDiscount(subtotal: number, percent: number): number {
  // Rounded to the nearest dinar like line totals; clamped so a bad setting can never make a bill negative.
  return Math.min(subtotal, Math.max(0, Math.round((subtotal * percent) / 100)));
}

/** A company's platform fee: its percentage of the bill's items, in whole dinars. */
export const companyFee = (subtotal: number, feePercent: number) => Math.round((subtotal * feePercent) / 100);

export function priceBills<L extends PricedLineInput>(
  input: L[],
  fees: Fees,
  { method, cityOk, deal }: { method: Method; cityOk: boolean; deal?: Deal },
) {
  // Drinks are Servingo's own shop: they always make a separate bill, even when ordered with a restaurant.
  const lines = input.map((line) => ({
    ...line,
    billId: isDrink(line.item) ? SERVINGO_DRINKS : line.restaurantId,
    total: lineTotal(line.item.price, line.quantity),
  }));

  // One restaurant, one bill: fees and the delivery minimum apply per restaurant.
  // Bills follow the order restaurants were added in; Servingo's drinks bill comes last.
  const sellers = new Map<string, Seller>();
  for (const line of lines) {
    if (line.billId !== SERVINGO_DRINKS) sellers.set(line.billId, { id: line.billId, name: line.restaurantName });
  }
  sellers.set(SERVINGO_SELLER.id, SERVINGO_SELLER);

  const bills = [...sellers.values()].flatMap((seller) => {
    const own = lines.filter((line) => line.billId === seller.id);
    const drinks = seller.id === SERVINGO_DRINKS;
    if (own.length === 0) return [];
    const subtotal = own.reduce((sum, line) => sum + line.total, 0);
    const delivery = method === "dostava" && cityOk && subtotal >= fees.deliveryMinimum;
    const normalDeliveryFee = delivery ? fees.deliveryFee : 0;
    // The platform fee is for arranging a restaurant's order; Servingo's own drinks do not pay it.
    // A company pays its percentage instead, on every bill: that is its price, not a discount.
    const normalPlatformFee = deal?.kind === "company" ? companyFee(subtotal, deal.feePercent) : drinks ? 0 : fees.platformFee;
    const promo = deal?.kind === "promo";

    const discount = promo ? promoDiscount(subtotal, deal.percent) : 0;
    const deliveryFee = promo ? 0 : normalDeliveryFee;
    const platformFee = promo ? 0 : normalPlatformFee;
    // The fees and total without the promo code, shown struck through; equal to the charged ones otherwise.
    const baseDeliveryFee = normalDeliveryFee;
    const basePlatformFee = normalPlatformFee;
    const originalTotal = subtotal + baseDeliveryFee + basePlatformFee;

    const pickupReason: PickupReason | null = delivery
      ? null
      : method === "preuzimanje"
        ? "chosen"
        : !cityOk
          ? "city"
          : "minimum";
    return [
      {
        restaurant: seller,
        /** Servingo's drinks bill: not delivered goes "by arrangement" rather than picked up at a restaurant. */
        drinks,
        lines: own,
        subtotal,
        delivery,
        /** Why a bill is pickup: the customer chose it, the city is outside Belgrade, or it is under the minimum. */
        pickupReason,
        baseDeliveryFee,
        basePlatformFee,
        deliveryFee,
        platformFee,
        /** Dinars a promo code takes off the items; 0 without one. */
        discount,
        /** The bill at the normal price, shown struck through when a promo code lowers it. */
        originalTotal,
        total: subtotal - discount + deliveryFee + platformFee,
        missingForDelivery: Math.max(0, fees.deliveryMinimum - subtotal),
        // Servingo buys the drinks, so it gets the order email for its bill.
        notifyServingo: drinks,
      },
    ];
  });

  return {
    lines,
    bills,
    deal,
    subtotal: lines.reduce((sum, line) => sum + line.total, 0),
    discount: bills.reduce((sum, bill) => sum + bill.discount, 0),
    originalTotal: bills.reduce((sum, bill) => sum + bill.originalTotal, 0),
    total: bills.reduce((sum, bill) => sum + bill.total, 0),
    needsAddress: bills.some((bill) => bill.delivery),
    count: lines.length,
  };
}

/** What a promo code's owner earns on an order: their share of the items after the discount. */
export const commission = (baseRsd: number, commissionTenths: number) => Math.round((baseRsd * commissionTenths) / 1000);
