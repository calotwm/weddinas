import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Icon } from "@/components/icons";
import { BudgetItemCard, BudgetOverview, DueAlert, orderedBudgetItems, PaidDivider, RatesNote } from "@/components/planner/budget";
import { SubmitButton } from "@/components/submit-button";
import { BRIEF_CATALOG } from "@/core/brief-catalog";
import { currentMonth, today } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { loadRates } from "@/server/rates";
import { deleteBudgetItem, deletePayment, saveBudgetSettings, uploadPaymentReceipt } from "@/app/admin/planner-actions";
import { ReceiptForm } from "@/app/portal/presupuesto/receipt-form";
import { BudgetItemForm, PaymentForm } from "./forms";

export const dynamic = "force-dynamic";

const CATEGORIES = BRIEF_CATALOG.filter((b) => b.kind === "vendor").map(({ key, name }) => ({ key, name }));

export default async function BudgetAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  const { budget } = couple;
  const { ipc, quotes, quote } = await loadRates(budget.usdQuote);
  const hidden = <input type="hidden" name="coupleId" value={couple.id} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-forest">Presupuesto y pagos</h2>
          <RatesNote ipc={ipc} quote={quote} />
        </div>
        <form action={saveBudgetSettings} className="flex flex-wrap items-end gap-2">
          {hidden}
          <div>
            <label htmlFor="usdQuote" className="label">Dólar de referencia</label>
            <select id="usdQuote" name="usdQuote" defaultValue={budget.usdQuote} className="field !py-2">
              {(quotes.length ? quotes : [{ kind: budget.usdQuote, label: budget.usdQuote }]).map((q) => (
                <option key={q.kind} value={q.kind}>{q.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="guests" className="label">Invitados</label>
            <input id="guests" name="guests" type="number" min={0} defaultValue={budget.guests ?? ""} className="field w-28 !py-2" />
          </div>
          <SubmitButton className="btn-ghost btn-sm mb-1" doneText="¡Listo!">Guardar</SubmitButton>
        </form>
      </div>

      <DueAlert items={budget.items} ipc={ipc} today={today()} />
      <BudgetOverview budget={budget} ipc={ipc} quote={quote} />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <section className="card h-fit space-y-5 lg:sticky lg:top-24">
          <h3 className="section-title">Nuevo ítem</h3>
          <BudgetItemForm coupleId={couple.id} categories={CATEGORIES} defaultMonth={currentMonth()} />
        </section>

        <section className="space-y-5">
          {budget.items.length === 0 && (
            <div className="card text-center text-ink/60">
              <Icon name="gift" className="mx-auto mb-2 h-8 w-8 text-mint" />
              Todavía no hay ítems. Cargá el primer proveedor contratado.
            </div>
          )}
          {orderedBudgetItems(budget.items, ipc).map(({ item, anchor, firstPaid }) => (
            <Fragment key={item.id}>
              {firstPaid && <PaidDivider />}
              <BudgetItemCard
                coupleId={couple.id}
                item={item}
                ipc={ipc}
                anchor={anchor}
                paymentAction={(p) => (
                  <form action={deletePayment}>
                    {hidden}
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="paymentId" value={p.id} />
                    <SubmitButton className="btn-icon" pendingText="…" confirm="¿Borrar este pago?">
                      <Icon name="trash" className="h-4 w-4" />
                      <span className="sr-only">Borrar pago</span>
                    </SubmitButton>
                  </form>
                )}
                receiptAction={(p) => (
                  <ReceiptForm action={uploadPaymentReceipt} coupleId={couple.id} itemId={item.id} paymentId={p.id} replace={Boolean(p.receiptId)} />
                )}
              >
                <PaymentForm coupleId={couple.id} item={item} today={today()} arsPerUsd={quote?.sell ?? null} />
                <div className="flex items-start justify-between gap-2">
                  <details className="group min-w-0 flex-1">
                    <summary className="btn-ghost btn-sm w-fit list-none">
                      <Icon name="edit" className="h-3.5 w-3.5" />
                      Editar ítem
                    </summary>
                    <div className="mt-4">
                      <BudgetItemForm coupleId={couple.id} categories={CATEGORIES} defaultMonth={currentMonth()} item={item} />
                    </div>
                  </details>
                  <form action={deleteBudgetItem}>
                    {hidden}
                    <input type="hidden" name="itemId" value={item.id} />
                    <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Borrar "${item.vendor || item.concept}" y sus pagos?`}>
                      <Icon name="trash" className="h-4 w-4" />
                      <span className="sr-only">Borrar ítem</span>
                    </SubmitButton>
                  </form>
                </div>
              </BudgetItemCard>
            </Fragment>
          ))}
        </section>
      </div>
    </div>
  );
}
