import { Icon } from "@/components/icons";
import { budgetCurrency, BudgetItemCard, BudgetOverview, DueAlert, orderedBudgetItems, RatesNote } from "@/components/planner/budget";
import { today } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { getCurrentCouple } from "../data";

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ moneda?: string }> }) {
  const currency = budgetCurrency((await searchParams).moneda);
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
          <DueAlert items={budget.items} ipc={ipc} today={today()} />
          <BudgetOverview budget={budget} ipc={ipc} quote={quote} currency={currency} />
          <div className="grid gap-5 lg:grid-cols-2">
            {orderedBudgetItems(budget.items, ipc).map(({ item, anchor }) => (
              <BudgetItemCard key={item.id} item={item} ipc={ipc} anchor={anchor} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
