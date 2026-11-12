import { Fragment } from "react";
import { Icon } from "@/components/icons";
import { BudgetItemCard, BudgetOverview, DueAlert, FREIGHT_LABEL, orderedBudgetItems, PaidDivider, RatesNote } from "@/components/planner/budget";
import { SubmitButton } from "@/components/submit-button";
import { today } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { setBudgetItemFreight, uploadPaymentReceipt } from "../actions";
import { getCurrentCouple } from "../data";
import { ReceiptForm } from "./receipt-form";

export default async function BudgetPage() {
  const couple = await getCurrentCouple();
  const { budget } = couple;
  const { ipc, quote } = await loadRates(budget.usdQuote);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl text-forest">Presupuesto y pagos</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          Todo lo contratado, lo que ya pagaron y lo que falta. Los saldos en pesos que se ajustan por inflación se actualizan solos con el último IPC del INDEC.
        </p>
        <div className="mt-2">
          <RatesNote ipc={ipc} quote={quote} />
        </div>
      </div>

      {budget.items.length === 0 ? (
        <div className="card text-center text-ink/60">
          <Icon name="dollar" className="mx-auto mb-2 h-8 w-8 text-mint" />
          Cuando confirmen proveedores, el equipo va a cargar acá cada presupuesto y sus pagos.
        </div>
      ) : (
        <>
          <DueAlert items={budget.items} ipc={ipc} today={today()} brief={couple.brief} />
          <BudgetOverview budget={budget} ipc={ipc} quote={quote} brief={couple.brief} />
          <div className="grid gap-5 lg:grid-cols-2">
            {orderedBudgetItems(budget.items, ipc).map(({ item, anchor, firstPaid }) => (
              <Fragment key={item.id}>
                {firstPaid && <PaidDivider />}
                <BudgetItemCard
                  coupleId={couple.id}
                  item={item}
                  brief={couple.brief}
                  freightAction={
                    <form action={setBudgetItemFreight} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="hidden" name="itemId" value={item.id} />
                      <label htmlFor={`freight-${item.id}`} className="font-semibold text-forest">Flete/Viáticos:</label>
                      <select id={`freight-${item.id}`} name="freight" defaultValue={item.freight ?? ""} className="field w-auto py-1.5">
                        <option value="">{FREIGHT_LABEL.unknown}</option>
                        <option value="yes">{FREIGHT_LABEL.yes}</option>
                        <option value="no">{FREIGHT_LABEL.no}</option>
                      </select>
                      <SubmitButton className="btn-ghost btn-sm">Guardar</SubmitButton>
                    </form>
                  }
                  ipc={ipc}
                  anchor={anchor}
                  receiptAction={(p) => (
                    <ReceiptForm action={uploadPaymentReceipt} itemId={item.id} paymentId={p.id} replace={Boolean(p.receiptId)} />
                  )}
                />
              </Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
