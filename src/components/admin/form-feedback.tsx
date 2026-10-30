"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

export type FormActionResult = { ok: boolean; message: string; id?: string };

export function FormWithFeedback({
  action,
  children,
  className,
  submitLabel = "Save changes",
}: {
  action: (formData: FormData) => Promise<FormActionResult>;
  children: ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  const [result, formAction, pending] = useActionState(
    async (_previous: FormActionResult | null, formData: FormData) => action(formData),
    null,
  );
  return <form action={formAction} className={className}>
    {children}
    {result && <p className={result.ok ? "cms-alert cms-alert-success" : "cms-alert cms-alert-error"} role="status">{result.message}</p>}
    <button className="cms-primary-button" disabled={pending} type="submit">{pending ? "Saving…" : submitLabel}</button>
  </form>;
}
