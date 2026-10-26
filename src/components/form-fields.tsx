"use client";

import { startTransition, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

const label = (text: string, required?: boolean) => (
  <span className="text-[15px] font-medium">
    {text}
    {required && <span className="text-accent" aria-hidden="true"> *</span>}
  </span>
);

export function Field({ label: text, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      {label(text, props.required)}
      <input
        className="h-14 border border-line px-5 text-base placeholder:text-muted focus:border-ink focus:outline-none"
        {...props}
      />
    </label>
  );
}

/** Two or more bordered radio cards; the chosen one is outlined in orange. */
export function RadioCards<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string; note?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={`flex min-h-14 cursor-pointer items-center gap-3 border px-5 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ink ${
              checked ? "border-cta bg-accent-soft" : "border-line hover:border-ink"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${checked ? "border-cta" : "border-muted"}`}
            >
              {checked && <span className="size-2.5 rounded-full bg-cta" />}
            </span>
            <span className="flex flex-col">
              <span className="text-base font-medium">{option.label}</span>
              {option.note && <span className="text-sm text-muted">{option.note}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function TextArea({ label: text, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-2">
      {label(text, props.required)}
      <textarea
        rows={5}
        className="min-h-36 border border-line px-5 py-4 text-base placeholder:text-muted focus:border-ink focus:outline-none"
        {...props}
      />
    </label>
  );
}

/** Left empty by people; bots that fill every field give themselves away. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

/** Submits by hand so a failed attempt keeps what was typed (an action form would reset). */
export const submitKeeping = (dispatch: (form: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  startTransition(() => dispatch(form));
};

export function FormAlert({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div role="alert" className="border-l-2 border-cta bg-accent-soft px-4 py-3 text-[15px]">
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  );
}

export function FormSent({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" className="max-w-2xl border-l-2 border-cta bg-accent-soft px-5 py-4">
      <p className="text-lg font-medium">{title}</p>
      <p className="mt-1 text-[15px]">{text}</p>
    </div>
  );
}
