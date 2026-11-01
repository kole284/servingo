"use client";

import { useActionState, type ReactNode } from "react";
import { submitKeeping } from "@/components/form-fields";

export type AdminFormState = { error?: string; saved?: boolean } | null;

/**
 * A form posting to an admin Server Action. The action redirects on success or returns an error;
 * the typed values stay when it fails.
 */
export function AdminForm({
  action,
  children,
  submitLabel,
  className = "",
}: {
  action: (state: AdminFormState, form: FormData) => Promise<AdminFormState>;
  children: ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <form onSubmit={submitKeeping(dispatch)} className={`flex flex-col gap-5 ${className}`}>
      {children}
      {state?.error && (
        <p role="alert" className="border-l-2 border-cta bg-accent-soft px-4 py-3 text-[15px]">
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="text-[15px] text-muted">
          Sačuvano.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 caps-cta bg-cta px-7 text-on-cta hover:bg-cta-strong disabled:bg-surface disabled:text-muted sm:self-start"
      >
        {pending ? "Čuvanje…" : submitLabel}
      </button>
    </form>
  );
}
