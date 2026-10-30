import { Icon } from "@/components/icons";
import { BudgetItemCard, BudgetOverview, RatesNote } from "@/components/planner/budget";
import { loadRates } from "@/server/rates";
import { getCurrentCouple } from "../data";

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
          <Icon name="gift" className="mx-auto mb-2 h-8 w-8 text-mint" />
          Cuando confirmen proveedores, el equipo va a cargar acá cada presupuesto y sus pagos.
        </div>
      ) : (
        <>
          <BudgetOverview budget={budget} ipc={ipc} quote={quote} />
          <div className="grid gap-5 lg:grid-cols-2">
            {budget.items.map((item) => (
              <BudgetItemCard key={item.id} item={item} ipc={ipc} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
