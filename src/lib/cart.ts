"use client";

import { useSyncExternalStore } from "react";
import { belgradeNow, slotTime, type Method } from "./booking";
import { useConfig } from "./config";
import { isDrink, type MenuItem } from "./menu";
import { SERVINGO_SELLER, priceBills, type Fees, type Seller } from "./pricing";

export { SERVINGO_SELLER, type Seller } from "./pricing";

/**
 * `restaurantId` is the bill a line belongs to; drinks take the restaurant they were ordered with.
 * The item and restaurant name are copied in when added, so the cart renders without the catalog;
 * the server recalculates every price at checkout.
 */
export type CartLine = {
  itemId: string;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  item: MenuItem;
};
export type CartBooking = { date?: string; hour?: number; method?: Method };
/** `placedOrder` is the order sent to payment, so its status page can empty the cart once paid. */
type CartState = { lines: CartLine[]; booking: CartBooking; placedOrder?: string };

export const lineKey = (line: Pick<CartLine, "itemId" | "restaurantId">) => `${line.restaurantId}:${line.itemId}`;

// Kept in localStorage; only the booking and lines live here, prices come from the server.
const KEY = "servingo-cart";
const EMPTY: CartState = { lines: [], booking: {} };

let state: CartState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return;
    const saved = { ...EMPTY, ...JSON.parse(raw) } as CartState;
    // Carts saved before the database have no item copy; those lines are dropped.
    const lines = saved.lines.filter((line) => line.item && line.restaurantName);
    // A slot that has already passed is forgotten; the items stay and checkout asks for a new slot.
    const { date, hour, method } = saved.booking;
    const passed = date !== undefined && hour !== undefined && slotTime(date, hour) <= belgradeNow();
    state = { ...saved, booking: passed ? { method } : saved.booking, lines: moveDrinksToServingo(lines) };
  } catch {
    // Storage blocked or corrupt; start empty.
  }
}

/**
 * Drinks used to join the bill of the restaurant they were ordered with ("bistro-dorcol:servingo-pica-1").
 * They are now always on Servingo's bill ("servingo-pica:servingo-pica-1"), so saved carts are moved over.
 * The same drink may have been added with two restaurants, so two old lines can end up with one key.
 */
function moveDrinksToServingo(lines: CartLine[]): CartLine[] {
  // TODO(human): return the lines with every drink (isDrink(line.item)) on SERVINGO_SELLER's bill,
  // and decide what happens when two old lines become the same drink line.
  return lines;
}

function set(next: CartState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore; the cart still works for this page view.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => EMPTY,
  );
}

export function addToCart(item: MenuItem, quantity: number, seller: Seller) {
  const key = lineKey({ itemId: item.id, restaurantId: seller.id });
  const existing = state.lines.find((line) => lineKey(line) === key);
  const lines = existing
    ? state.lines.map((line) => (lineKey(line) === key ? { ...line, item, quantity: line.quantity + quantity } : line))
    : [...state.lines, { itemId: item.id, quantity, restaurantId: seller.id, restaurantName: seller.name, item }];
  set({ ...state, lines });
}

export function setQuantity(key: string, quantity: number) {
  set({
    ...state,
    lines:
      quantity <= 0
        ? state.lines.filter((line) => lineKey(line) !== key)
        : state.lines.map((line) => (lineKey(line) === key ? { ...line, quantity } : line)),
  });
}

export function setBooking(booking: CartBooking) {
  if (booking.date === undefined && booking.hour === undefined && booking.method === undefined) return;
  set({ ...state, booking: { ...state.booking, ...booking } });
}

export function clearCart() {
  set(EMPTY);
}

/** Removes one restaurant's bill: every line of its dishes. */
export function removeBill(restaurantId: string) {
  set({ ...state, lines: state.lines.filter((line) => isDrink(line.item) || line.restaurantId !== restaurantId) });
}

/** Remembers the order sent to payment; the cart stays in case the payment fails. */
export function markPlaced(code: string) {
  set({ ...state, placedOrder: code });
}

/** Empties the cart once the order made from it is paid. */
export function clearPlacedCart(code: string) {
  load();
  if (state.placedOrder === code) set(EMPTY);
}

/** Replaces the cart's item copies with fresh ones from the server, e.g. after a price change. */
export function updateItems(items: MenuItem[]) {
  const fresh = new Map(items.map((item) => [item.id, item]));
  set({ ...state, lines: state.lines.map((line) => ({ ...line, item: fresh.get(line.itemId) ?? line.item })) });
}

type DetailsOptions = { method?: Method; cityOk?: boolean };

export function cartDetails(
  cart: CartState,
  fees: Fees & { leadTimes?: Record<string, number> },
  // At checkout the chosen method and city decide delivery; elsewhere the homepage choice does.
  { method = cart.booking.method ?? "dostava", cityOk = true }: DetailsOptions = {},
) {
  const details = priceBills(cart.lines.map((line) => ({ ...line, key: lineKey(line) })), fees, { method, cityOk });
  // A restaurant whose lead time no longer fits the slot (e.g. after choosing an earlier one) is flagged here;
  // the server refuses such an order anyway, but the customer should see it before paying.
  const { date, hour } = cart.booking;
  const msAhead = date && hour !== undefined ? slotTime(date, hour) - belgradeNow() : undefined;
  const bills = details.bills.map((bill) => ({
    ...bill,
    tooLate: msAhead !== undefined && msAhead < (fees.leadTimes?.[bill.restaurant.id] ?? 0) * 3_600_000,
  }));
  return { ...details, bills, tooLate: bills.filter((bill) => bill.tooLate) };
}

/** The cart worked out into bills with the current fees. */
export function useCartDetails(options?: DetailsOptions) {
  return cartDetails(useCart(), useConfig(), options);
}

export type CartDetails = ReturnType<typeof cartDetails>;
export type CartBill = CartDetails["bills"][number];
