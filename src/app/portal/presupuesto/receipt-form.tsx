"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { ReceiptResult } from "@/server/receipts";

/** Attaches (or replaces) a payment's receipt; used by the couple's and the team's budget pages. */
export function ReceiptForm({
  action,
  itemId,
  paymentId,
  coupleId,
  replace,
}: {
  action: (prev: ReceiptResult, formData: FormData) => Promise<ReceiptResult>;
  itemId: string;
  paymentId: string;
  /** Only the team's action reads it; the couple's takes the id from the session. */
  coupleId?: string;
  replace: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const form = (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {coupleId && <input type="hidden" name="coupleId" value={coupleId} />}
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="paymentId" value={paymentId} />
      <label className="text-xs text-ink/60">
        <span className="sr-only">{replace ? "Reemplazar comprobante" : "Adjuntar comprobante"}</span>
        <input name="receipt" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="max-w-56 text-xs" />
      </label>
      <SubmitButton className="btn-ghost btn-sm" pendingText="Subiendo…" doneText="¡Listo!">
        {replace ? "Reemplazar comprobante" : "Adjuntar comprobante"}
      </SubmitButton>
      {state?.error && <p role="alert" className="w-full text-xs text-rust">{state.error}</p>}
    </form>
  );
  if (!replace) return form;
  // A payment that already has its receipt keeps the replace control folded away.
  return (
    <details>
      <summary className="cursor-pointer text-xs text-ink/55">Cambiar comprobante</summary>
      <div className="mt-2">{form}</div>
    </details>
  );
}
