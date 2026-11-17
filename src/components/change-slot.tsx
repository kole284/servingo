"use client";

import { useRef, useState } from "react";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { TIME_SLOTS, belgradeNow, belgradeTodayIso, slotTime } from "@/lib/booking";
import { setBooking, useCart } from "@/lib/cart";
import { useConfig } from "@/lib/config";
import { isDrink } from "@/lib/menu";
import { Calendar } from "./booking-form";
import { ChevronDownIcon } from "./icons";

/**
 * Opens a date and time picker over the page and changes the cart's slot in place; the items stay.
 * While choosing, it lists the restaurants in the cart that cannot make the chosen slot.
 */
export function ChangeSlotButton({ label, className }: { label: string; className: string }) {
  const { t } = useI18n();
  const cart = useCart();
  const { leadTimes } = useConfig();
  const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState<string>();
  const [hour, setHour] = useState("");
  // Remounts the calendar on every opening, so it shows the month of the current slot.
  const [opened, setOpened] = useState(0);

  const open = () => {
    // Start from the current slot each time the picker opens.
    setDate(cart.booking.date);
    setHour(cart.booking.hour === undefined ? "" : String(cart.booking.hour));
    setOpened((n) => n + 1);
    dialog.current?.showModal();
  };

  // Restaurants in the cart and how far ahead each needs the order, from the current catalog.
  const restaurants = new Map<string, { name: string; leadTimeHours: number }>();
  for (const line of cart.lines) {
    if (!isDrink(line.item)) {
      restaurants.set(line.restaurantId, { name: line.restaurantName, leadTimeHours: leadTimes[line.restaurantId] ?? 0 });
    }
  }
  const chosen = date !== undefined && hour !== "";
  const msAhead = chosen ? slotTime(date, Number(hour)) - belgradeNow() : undefined;
  const passed = msAhead !== undefined && msAhead <= 0;
  const tooLate =
    msAhead === undefined || passed
      ? []
      : [...restaurants.values()].filter((r) => msAhead < r.leadTimeHours * 3_600_000);

  const save = () => {
    if (!chosen || passed) return;
    setBooking({ date, hour: Number(hour) });
    dialog.current?.close();
  };

  return (
    <>
      <button type="button" onClick={open} className={className}>
        {label}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="promena-termina"
        className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-lg overflow-y-auto p-0 backdrop:bg-ink/40"
      >
        <div className="flex flex-col gap-6 p-6 md:p-8">
          <h2 id="promena-termina" className="text-2xl font-medium tracking-[-0.01em]">
            {t.checkout.changeSlot}
          </h2>
          <Calendar key={opened} value={date} todayIso={belgradeTodayIso()} onChange={setDate} />
          <label className="flex flex-col gap-2">
            <span className="caps">{t.booking.time}</span>
            <span className="relative">
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className={`h-14 w-full appearance-none border-b border-ink bg-transparent pr-8 text-lg focus:outline-none ${hour ? "" : "text-muted"}`}
              >
                <option value="" disabled>
                  {t.booking.slotPlaceholder}
                </option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.hour} value={slot.hour}>
                    {slot.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={18} className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2" />
            </span>
          </label>

          {(passed || tooLate.length > 0) && (
            <div role="alert" className="flex flex-col gap-1 border-l-2 border-cta bg-accent-soft px-4 py-3 text-[15px]">
              {passed ? (
                <p>{t.cart.slotPassed}</p>
              ) : (
                tooLate.map((r) => <p key={r.name}>{fill(t.cart.tooLate, { restaurant: r.name })}</p>)
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              onClick={save}
              disabled={!chosen || passed}
              className="flex h-12 flex-1 items-center justify-center caps-cta bg-cta text-on-cta hover:bg-cta-strong disabled:bg-surface disabled:text-muted"
            >
              {t.cart.saveSlot}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="flex h-12 flex-1 items-center justify-center caps border border-ink"
            >
              {t.cart.clearNo}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
