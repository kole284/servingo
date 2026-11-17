"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { PaymentSummary, SlotWarning } from "@/components/order-summary";
import { formatDate, slotLabel, type Method } from "@/lib/booking";
import { fill } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import { cartDetails, markPlaced, setBooking, updateItems, useCart } from "@/lib/cart";
import { useConfig } from "@/lib/config";
import { formatPrice } from "@/lib/menu";
import { ChangeSlotButton } from "@/components/change-slot";
import { Field, RadioCards } from "@/components/form-fields";
import { ChevronDownIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n/dictionaries/sr";
import type { Locale } from "@/i18n/config";
import type { OrderError } from "@/server/orders";
import { checkCompany, checkPromo, placeOrder, type CompanyResult, type PlaceOrderResult, type PromoResult } from "./actions";
import type { Deal } from "@/lib/pricing";

type AppliedPromo = Extract<PromoResult, { ok: true }>;
type AppliedCompany = Extract<CompanyResult, { ok: true }>;

function errorText(error: OrderError, locale: Locale, t: Dictionary) {
  const messages = t.checkout.errors;
  switch (error.code) {
    case "item_unavailable":
      return error.name ? fill(messages.item_unavailable_named, { name: error.name }) : messages.item_unavailable;
    case "bad_quantity":
      return fill(messages.bad_quantity, { name: error.name });
    case "too_late":
      return fill(messages.too_late, { restaurant: error.restaurant });
    case "price_changed":
      return fill(messages.price_changed, { amount: formatPrice(error.total, locale, t) });
    default:
      return messages[error.code] ?? messages.generic;
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-ink pt-6">
      <h2 className="caps-title text-base">{title}</h2>
      {children}
    </section>
  );
}

export function CheckoutForm() {
  const { locale, t, href } = useI18n();
  const raw = useCart();
  const config = useConfig();
  const { date, hour } = raw.booking;
  // The homepage choice (step 04) is the default; changing it here updates the saved booking.
  const method: Method = raw.booking.method ?? "dostava";
  const [city, setCity] = useState("");
  const outsideArea = city === "drugo";
  const [result, dispatch, pending] = useActionState(placeOrder, null);
  // A promo code the server accepted, with the order attempt it was applied after.
  const [applied, setApplied] = useState<{ promo: AppliedPromo; after: PlaceOrderResult } | null>(null);
  // An attempt that came back saying the code no longer works drops it, until the customer applies one again.
  const promoRefused =
    !!result && !result.ok && result.errors.some((error) => error.code === "promo_invalid" || error.code === "promo_expired");
  const promo = applied && !(promoRefused && applied.after !== result) ? applied.promo : null;
  const setPromo = (next: AppliedPromo | null) => setApplied(next ? { promo: next, after: result } : null);
  // Card, or the company's monthly invoice once its code and the employee's email were accepted.
  const [paying, setPaying] = useState<"kartica" | "faktura">("kartica");
  const [company, setCompany] = useState<AppliedCompany | null>(null);
  const invoice = paying === "faktura" && company !== null;
  const deal: Deal | undefined = invoice
    ? { kind: "company", feePercent: company.feePercent }
    : promo
      ? { kind: "promo", code: promo.code, percent: promo.percent }
      : undefined;
  const formRef = useRef<HTMLFormElement>(null);
  const cart = cartDetails(raw, config, { method, cityOk: !outsideArea, deal });
  const [buyer, setBuyer] = useState<"fizicko" | "pravno">("fizicko");
  // One key per checkout visit: sending the same cart and details twice reuses the order.
  const clientKey = useRef<string>(null);
  // The server's total wins once it has said the amount changed.
  const changed = result && !result.ok ? result.errors.find((error) => error.code === "price_changed") : undefined;
  const total = changed?.total ?? cart.total;

  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      markPlaced(result.code);
      window.location.assign(result.redirectUrl);
      return;
    }
    if (result.catalog) updateItems(result.catalog);
  }, [result]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    // Dispatched by hand so a failed attempt keeps what the customer typed.
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    clientKey.current ??= crypto.randomUUID();
    form.set("kljuc", clientKey.current);
    startTransition(() => dispatch(form));
  };

  const errors = result && !result.ok ? [...new Set(result.errors.map((error) => errorText(error, locale, t)))] : [];

  if (cart.count === 0 && !result?.ok) {
    return (
      <div className="mt-8">
        <p className="text-lg text-muted">{t.checkout.empty}</p>
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
    <form ref={formRef} onSubmit={submit} className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
      <input type="hidden" name="korpa" value={JSON.stringify(raw.lines.map(({ itemId, restaurantId, quantity }) => ({ itemId, restaurantId, quantity })))} />
      <input type="hidden" name="datum" value={date ?? ""} />
      <input type="hidden" name="vreme" value={hour ?? ""} />
      <input type="hidden" name="iznos" value={total} />
      <input type="hidden" name="jezik" value={locale} />
      <input type="hidden" name="promo" value={invoice ? "" : (promo?.code ?? "")} />
      <input type="hidden" name="placanje" value={invoice ? "faktura" : "kartica"} />
      <input type="hidden" name="firmaKod" value={invoice ? company.code : ""} />
      <div className="flex min-w-0 max-w-2xl flex-col gap-10">
        <Section title={method === "preuzimanje" ? t.checkout.slotPickup : t.checkout.slot}>
          {date && hour !== undefined ? (
            // Same summary box as the restaurant list, so changing the slot is hard to miss.
            <div className="flex flex-col gap-4 bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-medium">
                {formatDate(date, locale)}, {slotLabel(hour)}
              </p>
              <ChangeSlotButton
                label={t.checkout.changeSlot}
                className="flex h-11 shrink-0 items-center justify-center caps border border-ink px-6 hover:bg-bg"
              />
            </div>
          ) : (
            <p className="text-[15px] text-muted">
              {t.checkout.noSlot}{" "}
              <ChangeSlotButton label={t.checkout.pickSlot} className="font-medium text-ink underline underline-offset-4" />
            </p>
          )}
        </Section>

        <Section title={t.checkout.method}>
          <RadioCards<Method>
            name="nacin"
            label={t.checkout.method}
            value={method}
            onChange={(value) => setBooking({ method: value })}
            options={[
              { value: "dostava", label: t.booking.delivery, note: outsideArea ? t.checkout.unavailable : undefined },
              { value: "preuzimanje", label: t.booking.pickup },
            ]}
          />
          {method === "dostava" && (
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium">
                {t.checkout.city}
                <span className="text-accent" aria-hidden="true"> *</span>
              </span>
              <span className="relative">
                <select
                  name="grad"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={`h-14 w-full appearance-none border border-line bg-bg px-5 pr-12 text-base focus:border-ink focus:outline-none ${city ? "" : "text-muted"}`}
                >
                  <option value="" disabled>
                    {t.checkout.cityPlaceholder}
                  </option>
                  <optgroup label={t.checkout.cityGroup}>
                    {config.deliveryCities.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                  <option value="drugo">{t.checkout.otherCity}</option>
                </select>
                <ChevronDownIcon size={18} className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2" />
              </span>
            </label>
          )}
          {method === "dostava" && outsideArea && (
            <p role="alert" className="border-l-2 border-cta bg-accent-soft px-4 py-3 text-[15px]">
              {t.checkout.cityWarning}
            </p>
          )}
        </Section>

        <Section title={t.checkout.delivery}>
          <Field label={t.checkout.name} name="ime" autoComplete="name" required />
          {cart.needsAddress ? (
            <Field label={t.checkout.address} name="adresa" autoComplete="street-address" required />
          ) : (
            !outsideArea && (
              <p className="text-[15px] text-muted">
                {cart.bills.some((bill) => !bill.drinks) ? t.checkout.pickupOnly : t.cart.drinksArranged}
              </p>
            )
          )}
          {/* Restaurants not delivering are picked up; the drinks bill is arranged, which its summary explains. */}
          {cart.needsAddress && cart.bills.some((bill) => !bill.delivery && !bill.drinks) && (
            <p className="text-sm text-muted">
              {t.cart.pickup}:{" "}
              {cart.bills
                .filter((bill) => !bill.delivery && !bill.drinks)
                .map((bill) => bill.restaurant.name)
                .join(", ")}
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t.checkout.email} name="email" type="email" autoComplete="email" required />
            <Field label={t.checkout.phone} name="telefon" type="tel" autoComplete="tel" required />
          </div>
        </Section>

        {!invoice && (
          <Section title={t.checkout.buyer}>
            <RadioCards<"fizicko" | "pravno">
              name="kupac"
              label={t.checkout.buyer}
              value={buyer}
              onChange={setBuyer}
              options={[
                { value: "fizicko", label: t.checkout.person },
                { value: "pravno", label: t.checkout.company },
              ]}
            />
            {buyer === "pravno" && (
              <div className="flex flex-col gap-5">
                <Field label={t.checkout.companyName} name="firma" autoComplete="organization" required />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label={t.checkout.pib} name="pib" inputMode="numeric" pattern="\d{9}" title={t.checkout.pibHint} required />
                  <Field label={t.checkout.mb} name="mb" inputMode="numeric" pattern="\d{8}" title={t.checkout.mbHint} required />
                </div>
              </div>
            )}
          </Section>
        )}

        <Section title={t.checkout.payment}>
          <RadioCards<"kartica" | "faktura">
            name="nacinPlacanja"
            label={t.checkout.payment}
            value={paying}
            onChange={setPaying}
            options={[
              { value: "kartica", label: t.checkout.payCard },
              { value: "faktura", label: t.checkout.payInvoice, note: t.checkout.payInvoiceNote },
            ]}
          />
          {paying === "kartica" ? (
            <p className="text-[15px]">{t.checkout.paymentText}</p>
          ) : (
            <CompanyField
              applied={company}
              onChange={setCompany}
              email={() => String(new FormData(formRef.current ?? undefined).get("email") ?? "")}
            />
          )}
        </Section>
      </div>

      <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
        <PaymentSummary cart={cart}>
          {errors.length > 0 && (
            <div role="alert" className="border-l-2 border-cta bg-bg px-4 py-3 text-[15px]">
              <p className="font-medium">{t.checkout.errorsTitle}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {paying === "kartica" && <PromoField applied={promo} onChange={setPromo} />}
          {/* Paying waits until every restaurant can make the slot. */}
          {cart.tooLate.map((bill) => (
            <SlotWarning key={bill.restaurant.id} bill={bill} />
          ))}
          <button
            type="submit"
            disabled={pending || result?.ok || cart.tooLate.length > 0 || (paying === "faktura" && !invoice)}
            className="h-14 caps-cta bg-cta text-on-cta hover:bg-cta-strong disabled:bg-surface disabled:text-muted"
          >
            {pending || result?.ok
              ? invoice
                ? t.checkout.sending
                : t.checkout.paying
              : fill(invoice ? t.checkout.sendInvoiceOrder : t.checkout.pay, { amount: formatPrice(total, locale, t) })}
          </button>
          <Link href={href("/korpa")} className="text-center text-[15px] font-medium underline underline-offset-4">
            {t.checkout.editCart}
          </Link>
        </PaymentSummary>
      </div>
    </form>
  );
}

/** Promo code box above the pay button: checks the code on the server, then the summary shows the lower price. */
function PromoField({
  applied,
  onChange,
}: {
  applied: AppliedPromo | null;
  onChange: (promo: AppliedPromo | null) => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (applied) {
    return (
      <div className="flex flex-col gap-2 border-l-2 border-accent bg-bg px-4 py-3 text-[15px]">
        <p>{fill(t.checkout.promoApplied, { code: applied.code, percent: String(applied.percent) })}</p>
        <button type="button" onClick={() => onChange(null)} className="self-start font-medium underline underline-offset-4">
          {t.checkout.promoRemove}
        </button>
      </div>
    );
  }

  const apply = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const result = await checkPromo(code);
      if (result.ok) onChange(result);
      else setError(t.checkout.errors[result.reason]);
    } catch {
      setError(t.checkout.errors.generic);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="promo-kod" className="text-[15px] font-medium">
        {t.checkout.promo}
      </label>
      <div className="flex gap-2">
        <input
          id="promo-kod"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            // Enter applies the code instead of submitting the order.
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder={t.checkout.promoPlaceholder}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "promo-greska" : undefined}
          className="h-12 min-w-0 flex-1 border border-line bg-bg px-4 text-base uppercase placeholder:normal-case focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={checking || !code.trim()}
          className="h-12 shrink-0 caps border border-ink px-5 hover:bg-bg disabled:border-line disabled:text-muted"
        >
          {t.checkout.promoApply}
        </button>
      </div>
      {error && (
        <p id="promo-greska" role="alert" className="border-l-2 border-cta pl-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Company code for an order on the company's invoice; checked with the email typed above. */
function CompanyField({
  applied,
  onChange,
  email,
}: {
  applied: AppliedCompany | null;
  onChange: (company: AppliedCompany | null) => void;
  email: () => string;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (applied) {
    return (
      <div className="flex flex-col gap-2 border-l-2 border-cta bg-accent-soft px-4 py-3 text-[15px]">
        <p>{fill(t.checkout.companyApplied, { name: applied.name, percent: String(applied.feePercent) })}</p>
        <button type="button" onClick={() => onChange(null)} className="self-start font-medium underline underline-offset-4">
          {t.checkout.companyRemove}
        </button>
      </div>
    );
  }

  const check = async () => {
    if (!code.trim()) return;
    const address = email().trim();
    if (!address) {
      setError(t.checkout.companyNeedsEmail);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const result = await checkCompany(code, address);
      if (result.ok) onChange(result);
      else setError(t.checkout.errors[result.reason]);
    } catch {
      setError(t.checkout.errors.generic);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="firma-kod" className="text-[15px] font-medium">
        {t.checkout.companyCode}
      </label>
      <div className="flex gap-2">
        <input
          id="firma-kod"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void check();
            }
          }}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "firma-greska firma-pomoc" : "firma-pomoc"}
          className="h-12 min-w-0 flex-1 border border-line bg-bg px-4 text-base uppercase focus:border-ink focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void check()}
          disabled={checking || !code.trim()}
          className="h-12 shrink-0 caps border border-ink px-5 hover:bg-surface disabled:border-line disabled:text-muted"
        >
          {t.checkout.companyCheck}
        </button>
      </div>
      <p id="firma-pomoc" className="text-sm text-muted">
        {t.checkout.companyCodeHint}
      </p>
      {error && (
        <p id="firma-greska" role="alert" className="border-l-2 border-cta pl-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
