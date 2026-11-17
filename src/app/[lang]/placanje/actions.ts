"use server";

import { parseLocale } from "@/i18n/config";
import { METHODS } from "@/lib/booking";
import { createOrder, type CartInput } from "@/server/orders";
import { findCompany } from "@/server/company";
import { findPromo } from "@/server/promo";

export type PlaceOrderResult = Awaited<ReturnType<typeof createOrder>> | null;

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : undefined;
};

/** Only ids and quantities are taken from the browser's cart; the server prices everything. */
function parseLines(raw: string | undefined): CartInput["lines"] {
  try {
    const lines: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(lines)) return [];
    return lines.flatMap((line) =>
      line &&
      typeof line.itemId === "string" &&
      typeof line.restaurantId === "string" &&
      typeof line.quantity === "number"
        ? [{ itemId: line.itemId, restaurantId: line.restaurantId, quantity: line.quantity }]
        : [],
    );
  } catch {
    return [];
  }
}

/** Checkout form: creates the order and returns the payment page to open. */
export async function placeOrder(_: PlaceOrderResult, form: FormData): Promise<PlaceOrderResult> {
  const method = METHODS.find((m) => m === text(form, "nacin")) ?? "dostava";
  const hour = Number(text(form, "vreme"));
  const companyCode = text(form, "placanje") === "faktura" ? text(form, "firmaKod") : undefined;
  return createOrder({
    cart: {
      lines: parseLines(text(form, "korpa")),
      date: text(form, "datum"),
      hour: Number.isInteger(hour) ? hour : undefined,
      method,
      city: text(form, "grad"),
      promo: text(form, "promo") || undefined,
      // The employee's email is added from the customer details when the order is checked.
      company: companyCode ? { code: companyCode, email: "" } : undefined,
    },
    customer: {
      name: text(form, "ime") ?? "",
      email: text(form, "email") ?? "",
      phone: text(form, "telefon") ?? "",
      address: text(form, "adresa"),
      buyerType: text(form, "kupac") === "pravno" ? "pravno" : "fizicko",
      companyName: text(form, "firma"),
      pib: text(form, "pib"),
      mb: text(form, "mb"),
    },
    clientKey: (text(form, "kljuc") ?? "").slice(0, 100),
    expectedTotal: Number(text(form, "iznos")),
    locale: parseLocale(text(form, "jezik")),
  });
}

export type PromoResult = { ok: true; code: string; percent: number } | { ok: false; reason: "promo_invalid" | "promo_expired" };

/** Checks a promo code so checkout can show the lower price; the order checks it again when placed. */
export async function checkPromo(raw: string): Promise<PromoResult> {
  const result = await findPromo(typeof raw === "string" ? raw : "");
  return result.ok ? { ok: true, code: result.promo.code, percent: result.percent } : result;
}

export type CompanyResult =
  | { ok: true; code: string; name: string; feePercent: number }
  | { ok: false; reason: "company_invalid" | "company_email" };

/** Checks a company code with the employee's email, so checkout can show the invoice price. */
export async function checkCompany(code: string, email: string): Promise<CompanyResult> {
  const result = await findCompany(String(code ?? ""), String(email ?? ""));
  return result.ok ? { ok: true, code: code.trim().toUpperCase(), name: result.company.name, feePercent: result.feePercent } : result;
}
