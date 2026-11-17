"use client";

import type { ReactNode } from "react";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { removeBill, type CartBill, type CartDetails } from "@/lib/cart";
import { useConfig } from "@/lib/config";
import { ChangeSlotButton } from "./change-slot";
import { formatPrice } from "@/lib/menu";
import type { Deal } from "@/lib/pricing";
import { Amount } from "./amount";

/** One restaurant's bill: food, delivery or pickup, platform fee. */
export function BillSummary({ bill, deal }: { bill: CartBill; deal?: Deal }) {
  const { locale, t } = useI18n();
  const { deliveryMinimum } = useConfig();
  const price = (amount: number) => formatPrice(amount, locale, t);

  return (
    <div className="flex flex-col gap-3 bg-surface p-5">
      <dl className="flex flex-col gap-2 text-[15px]">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{t.cart.subtotal}</dt>
          <dd className="tabular-nums">{price(bill.subtotal)}</dd>
        </div>
        {bill.discount > 0 && deal?.kind === "promo" && (
          <div className="flex justify-between gap-4 font-medium">
            <dt>{fill(t.cart.discount, { percent: String(deal.percent), code: deal.code })}</dt>
            <dd className="tabular-nums">−{price(bill.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">{bill.delivery ? t.cart.delivery : bill.drinks ? t.cart.arranged : t.cart.pickup}</dt>
          <dd>
            <Amount value={price(bill.deliveryFee)} original={price(bill.baseDeliveryFee)} originalLabel={t.cart.withoutCode} />
          </dd>
        </div>
        {!bill.drinks && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.cart.platform}</dt>
            <dd>
              <Amount value={price(bill.platformFee)} original={price(bill.basePlatformFee)} originalLabel={t.cart.withoutCode} />
            </dd>
          </div>
        )}
        <div className="mt-1 flex justify-between gap-4 border-t border-ink pt-3 font-medium">
          <dt>{t.cart.billTotal}</dt>
          <dd>
            <Amount value={price(bill.total)} original={price(bill.originalTotal)} originalLabel={t.cart.withoutCode} />
          </dd>
        </div>
      </dl>
      {bill.pickupReason && (
        <p className="text-sm text-muted">
          {bill.drinks
            ? bill.pickupReason === "minimum"
              ? fill(t.cart.drinksMinimum, { min: price(deliveryMinimum), missing: price(bill.missingForDelivery) })
              : t.cart.drinksArranged
            : bill.pickupReason === "chosen"
              ? t.cart.pickupChosen
              : bill.pickupReason === "city"
                ? t.cart.pickupCity
                : fill(t.cart.pickupNote, { min: price(deliveryMinimum), missing: price(bill.missingForDelivery) })}
        </p>
      )}
    </div>
  );
}

/** Sidebar total: each restaurant's bill and the amount paid in one go. */
export function PaymentSummary({ cart, children }: { cart: CartDetails; children?: ReactNode }) {
  const { locale, t } = useI18n();
  const price = (amount: number) => formatPrice(amount, locale, t);

  return (
    <div className="flex flex-col gap-5 bg-surface p-5 md:p-6">
      <p className="caps-title text-sm">{t.cart.toPay}</p>
      <dl className="flex flex-col gap-2 text-[15px]">
        {cart.bills.map((bill) => (
          <div key={bill.restaurant.id} className="flex justify-between gap-4">
            <dt className="min-w-0 truncate text-muted">
              {bill.drinks ? t.cart.drinksBill : bill.restaurant.name}
              <span className="sr-only"> ({bill.delivery ? t.cart.delivery : bill.drinks ? t.cart.arranged : t.cart.pickup})</span>
            </dt>
            <dd>
              <Amount value={price(bill.total)} original={price(bill.originalTotal)} originalLabel={t.cart.withoutCode} />
            </dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-ink pt-4 text-lg font-medium">
          <dt>{t.cart.grandTotal}</dt>
          <dd>
            <Amount value={price(cart.total)} original={price(cart.originalTotal)} originalLabel={t.cart.withoutCode} />
          </dd>
        </div>
      </dl>
      {children}
    </div>
  );
}

/** A restaurant that cannot prepare the order for the chosen slot: remove its dishes or pick a later slot. */
export function SlotWarning({ bill }: { bill: CartBill }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-col gap-3 border-l-2 border-cta bg-accent-soft px-4 py-3 text-[15px]">
      <p>{fill(t.cart.tooLate, { restaurant: bill.restaurant.name })}</p>
      <div className="flex flex-wrap gap-3">
        <ChangeSlotButton
          label={t.checkout.changeSlot}
          className="flex h-10 items-center caps border border-ink bg-bg px-4 hover:bg-surface"
        />
        <button type="button" onClick={() => removeBill(bill.restaurant.id)} className="font-medium underline underline-offset-4">
          {t.cart.removeBill}
        </button>
      </div>
    </div>
  );
}
