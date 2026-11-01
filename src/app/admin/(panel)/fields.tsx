import type { ReactNode } from "react";

/** Small form controls for the admin; inputs share the site's field style. */

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-[var(--color-cta)]" />
      {label}
    </label>
  );
}

export function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[15px] font-medium">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-14 border border-line bg-bg px-5 text-base focus:border-ink focus:outline-none">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const Row = ({ children }: { children: ReactNode }) => <div className="grid gap-5 md:grid-cols-2">{children}</div>;

export const Hint = ({ children }: { children: ReactNode }) => <p className="-mt-3 text-[13px] text-muted">{children}</p>;
