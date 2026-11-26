"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { ReceiptResult } from "@/server/receipts";

/** Adds payment files ("archivos de pago") to a payment; used by the couple's and the team's budget pages. */
export function ReceiptForm({
  action,
  itemId,
  paymentId,
  coupleId,
  hasFiles,
}: {
  action: (prev: ReceiptResult, formData: FormData) => Promise<ReceiptResult>;
  itemId: string;
  paymentId: string;
  /** Only the team's action reads it; the couple's takes the id from the session. */
  coupleId?: string;
  hasFiles: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const form = (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <label className="text-xs text-ink/60">
        <span className="sr-only">Archivos de pago</span>
        <input name="receipt" type="file" multiple required accept="application/pdf,image/jpeg,image/png,image/webp" className="max-w-56 text-xs" />
      </label>
      <SubmitButton className="btn-ghost btn-sm" pendingText="Subiendo…" doneText="¡Listo!">
        Agregar archivos de pago
      </SubmitButton>
      {state?.error && <p role="alert" className="w-full text-xs text-rust">{state.error}</p>}
    </form>
  );
  if (!hasFiles) return form;
  // A payment that already has files keeps the add control folded away.
  return (
    <details>
      <summary className="cursor-pointer text-xs text-ink/55">Agregar más archivos de pago</summary>
      <div className="mt-2">{form}</div>
    </details>
  );
}
