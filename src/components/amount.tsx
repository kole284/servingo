/**
 * An amount, with the normal price struck through above it when a promo code lowered it,
 * so the customer can see the code really made the bill cheaper. No hooks: works on server and client pages.
 */
export function Amount({ value, original, originalLabel }: { value: string; original?: string; originalLabel: string }) {
  if (!original || original === value) return <span className="tabular-nums">{value}</span>;
  return (
    <span className="inline-flex flex-col items-end tabular-nums leading-tight">
      <s className="text-sm text-muted">
        <span className="sr-only">{originalLabel}: </span>
        {original}
      </s>
      <span className="font-medium">{value}</span>
    </span>
  );
}
