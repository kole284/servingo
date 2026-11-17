"use client";

import { useState } from "react";
import Link from "next/link";
import { BillSummary, PaymentSummary, SlotWarning } from "@/components/order-summary";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useI18n } from "@/i18n/provider";
import { clearCart, setQuantity, useCartDetails } from "@/lib/cart";
import { formatPrice, priceLabel } from "@/lib/menu";

export function CartView() {
  const { locale, t, href } = useI18n();
  const cart = useCartDetails();
  // Emptying asks once more, so a stray tap does not lose the order.
  const [confirming, setConfirming] = useState(false);

  if (cart.count === 0) {
    return (
      <div className="mt-8">
        <p className="text-lg text-muted">{t.cart.empty}</p>
        <Link
          href={href("/")}
          className="mt-6 inline-flex h-12 items-center caps-cta bg-cta px-7 text-on-cta hover:bg-cta-strong"
        >
          {t.cart.chooseSlot}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-12">
        {/* One restaurant, one bill. */}
        {cart.bills.map((bill) => (
          <section key={bill.restaurant.id} aria-labelledby={`korpa-${bill.restaurant.id}`}>
            <h2 id={`korpa-${bill.restaurant.id}`} className="caps-title border-b border-ink pb-3 text-base">
              {bill.drinks ? t.cart.drinksBill : bill.restaurant.name}
            </h2>
            {bill.tooLate && (
              <div className="mt-4">
                <SlotWarning bill={bill} />
              </div>
            )}
            <ul>
              {bill.lines.map((line) => (
                <li
                  key={line.key}
                  className="flex flex-col gap-4 border-b border-line py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-lg font-medium">{line.item.name}</p>
                    <p className="text-[15px] text-muted">{priceLabel(line.item, locale, t)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <QuantityStepper
                      item={line.item}
                      value={line.quantity}
                      onChange={(quantity) => setQuantity(line.key, quantity)}
                      allowZero
                    />
                    <p className="text-right text-[15px] font-medium tabular-nums md:w-28">
                      {formatPrice(line.total, locale, t)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 md:ml-auto md:max-w-sm">
              <BillSummary bill={bill} />
            </div>
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[15px]">
          {confirming ? (
            <>
              <span>{t.cart.clearConfirm}</span>
              <button type="button" onClick={clearCart} className="h-11 caps border border-ink px-5 hover:bg-surface">
                {t.cart.clearYes}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="font-medium underline underline-offset-4">
                {t.cart.clearNo}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="font-medium text-muted underline underline-offset-4 hover:text-ink">
              {t.cart.clear}
            </button>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
        <PaymentSummary cart={cart}>
          <Link
            href={href("/placanje")}
            className="flex h-14 items-center justify-center caps-cta bg-cta text-on-cta hover:bg-cta-strong"
          >
            {t.cart.goToPayment}
          </Link>
        </PaymentSummary>
      </div>
    </div>
  );
}
