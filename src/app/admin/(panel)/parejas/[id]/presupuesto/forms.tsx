"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { FREIGHT_LABEL, PAYMENT_KIND } from "@/components/planner/budget";
import type { BudgetItem } from "@/core/couple";
import type { Currency } from "@/core/money";
import { addPayment, saveBudgetItem, type PlannerResult } from "@/app/admin/planner-actions";

export interface CategoryOption {
  key: string;
  name: string;
}

function Feedback({ state }: { state: PlannerResult }) {
  if (!state?.error) return null;
  return <p role="alert" className="rounded-xl bg-rust/10 px-3 py-2 text-sm text-rust">{state.error}</p>;
}

/** Resets the form after each successful save so the next entry starts clean. */
function useResetOnSuccess(state: PlannerResult) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state?.ok]);
  return ref;
}

export function BudgetItemForm({
  coupleId,
  categories,
  defaultMonth,
  item,
}: {
  coupleId: string;
  categories: CategoryOption[];
  defaultMonth: string;
  item?: BudgetItem;
}) {
  const [state, action] = useActionState(saveBudgetItem, null);
  const ref = useResetOnSuccess(item ? null : state);
  const [currency, setCurrency] = useState<Currency>(item?.currency ?? "ARS");
  const id = item?.id ?? "new";

  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="coupleId" value={coupleId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`cat-${id}`} className="label">Rubro</label>
          <select id={`cat-${id}`} name="category" defaultValue={item?.category ?? "espacio"} className="field">
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`vendor-${id}`} className="label">Proveedor</label>
          <input id={`vendor-${id}`} name="vendor" defaultValue={item?.vendor} maxLength={120} className="field" placeholder="Ej: Darwin Tortugas" />
        </div>
      </div>
      <div>
        <label htmlFor={`concept-${id}`} className="label">Qué incluye</label>
        <input id={`concept-${id}`} name="concept" defaultValue={item?.concept} maxLength={200} className="field" placeholder="Ej: Salón + técnica, 8 horas" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor={`amount-${id}`} className="label">Monto total acordado</label>
          <input id={`amount-${id}`} name="amount" required inputMode="decimal" defaultValue={item?.amount} className="field" placeholder="Ej: 18000" />
        </div>
        <div>
          <span className="label">Moneda</span>
          <div className="flex gap-1 rounded-2xl bg-sand/60 p-1">
            {(["ARS", "USD"] as const).map((c) => (
              <label key={c} className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold ${currency === c ? "bg-white text-forest shadow-sm" : "text-ink/60"}`}>
                <input type="radio" name="currency" value={c} checked={currency === c} onChange={() => setCurrency(c)} className="sr-only" />
                {c === "ARS" ? "Pesos" : "Dólares"}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`adj-${id}`} className="label">Saldo</label>
          <select id={`adj-${id}`} name="adjustment" defaultValue={item?.adjustment ?? "ipc"} disabled={currency === "USD"} className="field disabled:opacity-60">
            <option value="ipc">Se ajusta por IPC</option>
            <option value="frozen">Congelado</option>
          </select>
          {currency === "USD" && <p className="hint mt-1">En dólares el monto queda fijo.</p>}
        </div>
        <div>
          <label htmlFor={`month-${id}`} className="label">Mes del acuerdo</label>
          <input id={`month-${id}`} name="baseMonth" type="month" required defaultValue={item?.baseMonth ?? defaultMonth} className="field" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div>
          <label htmlFor={`note-${id}`} className="label">Notas</label>
          <input id={`note-${id}`} name="note" defaultValue={item?.note} maxLength={500} className="field" placeholder="Ej: Saldo 30 días antes del evento" />
        </div>
        <div>
          <label htmlFor={`due-${id}`} className="label">Próximo vencimiento</label>
          <input id={`due-${id}`} name="dueDate" type="date" defaultValue={item?.dueDate} className="field" />
        </div>
      </div>
      <div className="sm:w-1/2">
        <label htmlFor={`freight-${id}`} className="label">Flete/Viáticos</label>
        <select id={`freight-${id}`} name="freight" defaultValue={item?.freight ?? ""} className="field">
          <option value="">{FREIGHT_LABEL.unknown}</option>
          <option value="yes">{FREIGHT_LABEL.yes}</option>
          <option value="no">{FREIGHT_LABEL.no}</option>
        </select>
      </div>
      <Feedback state={state} />
      <SubmitButton doneText="¡Guardado!">{item ? "Guardar cambios" : "Agregar al presupuesto"}</SubmitButton>
    </form>
  );
}

export function PaymentForm({ coupleId, item, today, arsPerUsd }: { coupleId: string; item: BudgetItem; today: string; arsPerUsd: number | null }) {
  const [state, action] = useActionState(addPayment, null);
  const ref = useResetOnSuccess(state);
  const [currency, setCurrency] = useState<Currency>(item.currency);
  const other = currency !== item.currency;

  return (
    <form ref={ref} action={action} className="space-y-3 rounded-2xl bg-sand/40 p-4">
      <input type="hidden" name="coupleId" value={coupleId} />
      <input type="hidden" name="itemId" value={item.id} />
      <p className="text-sm font-semibold text-forest">Registrar pago</p>
      <div className="grid grid-cols-2 gap-3">
        <select name="kind" aria-label="Tipo de pago" defaultValue={item.payments.length ? "saldo" : "sena"} className="field">
          {Object.entries(PAYMENT_KIND).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input name="date" type="date" required aria-label="Fecha del pago" defaultValue={today} className="field" />
        <input name="amount" required inputMode="decimal" aria-label="Monto pagado" placeholder="Monto" className="field" />
        <select name="currency" aria-label="Moneda del pago" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="field">
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </select>
      </div>
      {other && (
        <div>
          <label htmlFor={`rate-${item.id}`} className="label">Tipo de cambio de ese día (pesos por dólar)</label>
          <input id={`rate-${item.id}`} name="arsPerUsd" required inputMode="decimal" defaultValue={arsPerUsd ?? ""} className="field" />
        </div>
      )}
      <input name="note" maxLength={300} aria-label="Nota del pago" placeholder="Nota (opcional): ej. transferencia, recibo n°…" className="field" />
      <div>
        <label htmlFor={`receipt-${item.id}`} className="label">Comprobante (opcional)</label>
        <input id={`receipt-${item.id}`} name="receipt" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm" />
        <p className="hint mt-1">PDF o imagen, hasta 10 MB (imágenes hasta 5 MB).</p>
      </div>
      <Feedback state={state} />
      <SubmitButton className="btn-ghost btn-sm" doneText="¡Registrado!">Registrar pago</SubmitButton>
    </form>
  );
}
