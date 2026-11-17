/**
 * Orders restaurants should prepare: paid by card, or a company's order on its monthly invoice.
 * Use this instead of comparing with "paid", so invoice orders are never left out.
 */
export const CONFIRMED_STATUSES = ["paid", "on_invoice"] as const;

export const isConfirmed = (status: string) => (CONFIRMED_STATUSES as readonly string[]).includes(status);
