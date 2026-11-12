import Link from "next/link";
import { Icon } from "@/components/icons";
import { PAYMENT_KIND } from "@/components/planner/budget";
import { categoryName } from "@/core/brief-catalog";
import { dueItems, isFullyPaid, summarizeBudget, summarizeItem } from "@/core/budget";
import { coupleNames, type BudgetItem, type CoupleView as Couple, type Payment } from "@/core/couple";
import { formatDay, formatMoney, monthEnd, today } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { loadRates } from "@/server/rates";

export const dynamic = "force-dynamic";

type Filters = { pareja?: string; pendientes?: string; mes?: string };

interface CoupleBudget {
  couple: Couple;
  items: BudgetItem[];
  pendingArs: number | null;
  pendingUsd: number | null;
}

function DueChip({ item, overdue }: { item: BudgetItem; overdue: boolean }) {
  if (!item.dueDate) return <span className="text-ink/40">—</span>;
  return (
    <span className={`chip ${overdue ? "bg-rust/10 text-rust" : "bg-sand text-ink/70"}`}>
      {overdue ? "Venció " : ""}
      {formatDay(item.dueDate)}
    </span>
  );
}

export default async function PaymentsAdminPage({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireAdmin();
  const filters = await searchParams;
  const onlyPending = filters.pendientes === "1";
  const thisMonth = filters.mes === "1";
  const day = today();

  const couples = (await portal.listCouples()).sort((a, b) => a.weddingDate.localeCompare(b.weddingDate));
  const selected = couples.filter((c) => !filters.pareja || c.id === filters.pareja);
  const snapshots = await Promise.all(selected.map((c) => loadRates(c.budget.usdQuote)));
  const ipc = snapshots[0]?.ipc ?? null;

  const groups: CoupleBudget[] = selected
    .map((couple, i) => {
      const dueThisMonth = new Set(dueItems(couple.budget.items, ipc, day, monthEnd(day)).map((d) => d.item.id));
      const items = couple.budget.items.filter(
        (item) => (!onlyPending || !isFullyPaid(item, ipc)) && (!thisMonth || dueThisMonth.has(item.id)),
      );
      const summary = summarizeBudget(couple.budget.items, ipc, snapshots[i].quote?.rate ?? null);
      return { couple, items, pendingArs: summary.pendingArs, pendingUsd: summary.pendingUsd };
    })
    .filter((g) => g.items.length > 0);

  const payments: Array<{ couple: Couple; item: BudgetItem; payment: Payment }> = selected
    .flatMap((couple) => couple.budget.items.flatMap((item) => item.payments.map((payment) => ({ couple, item, payment }))))
    .sort((a, b) => b.payment.date.localeCompare(a.payment.date));

  const filtered = Boolean(filters.pareja || onlyPending || thisMonth);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Pagos</h1>
        <p className="mt-2 text-sm text-ink/60">Todos los presupuestos y pagos de las parejas juntos. Tocá un rubro para editarlo.</p>
      </div>

      <form className="card flex flex-wrap items-end gap-3 p-4 sm:p-5">
        <div className="min-w-52 flex-1">
          <label htmlFor="pareja" className="label">Pareja</label>
          <select id="pareja" name="pareja" defaultValue={filters.pareja ?? ""} className="field !py-2">
            <option value="">Todas</option>
            {couples.map((c) => (
              <option key={c.id} value={c.id}>{coupleNames(c)}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm text-forest">
          <input type="checkbox" name="pendientes" value="1" defaultChecked={onlyPending} className="h-4 w-4 accent-forest" />
          Solo con saldo pendiente
        </label>
        <label className="flex items-center gap-2 py-2 text-sm text-forest">
          <input type="checkbox" name="mes" value="1" defaultChecked={thisMonth} className="h-4 w-4 accent-forest" />
          Vencen este mes (o ya vencieron)
        </label>
        <div className="flex gap-2">
          <button className="btn-primary btn-sm">Filtrar</button>
          {filtered && <Link href="/admin/pagos" className="btn-ghost btn-sm">Limpiar</Link>}
        </div>
      </form>

      {groups.length === 0 ? (
        <p className="card py-10 text-center text-ink/50">
          {filtered ? "Ningún rubro coincide con el filtro." : "Todavía no hay rubros cargados en los presupuestos."}
        </p>
      ) : (
        groups.map(({ couple, items, pendingArs, pendingUsd }) => (
          <section key={couple.id} className="card p-0 sm:p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-forest/8 p-4 sm:px-5">
              <Link href={`/admin/parejas/${couple.id}/presupuesto`} className="font-semibold text-forest underline-offset-4 hover:underline">
                {coupleNames(couple)}
              </Link>
              <p className="text-sm text-ink/65">
                Falta pagar:{" "}
                <span className="font-semibold text-forest">
                  {pendingArs !== null ? formatMoney(pendingArs, "ARS") : pendingUsd !== null ? formatMoney(pendingUsd, "USD") : "—"}
                </span>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs tracking-wide text-ink/50 uppercase">
                  <tr>
                    <th className="px-4 py-2 font-medium sm:px-5">Rubro</th>
                    <th className="px-2 py-2 font-medium">Proveedor</th>
                    <th className="px-2 py-2 text-right font-medium">Total</th>
                    <th className="px-2 py-2 text-right font-medium">Pago</th>
                    <th className="px-2 py-2 text-right font-medium">Falta</th>
                    <th className="px-4 py-2 font-medium sm:px-5">Próximo vencimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/6">
                  {items.map((item) => {
                    const s = summarizeItem(item, ipc);
                    const overdue = Boolean(item.dueDate && item.dueDate < day && s.pending > 0);
                    return (
                      <tr key={item.id} className="hover:bg-peach-soft/40">
                        <td className="px-4 py-2.5 sm:px-5">
                          <Link href={`/admin/parejas/${couple.id}/presupuesto`} className="font-semibold text-forest underline-offset-4 hover:underline">
                            {categoryName(item.category)}
                          </Link>
                        </td>
                        <td className="px-2 py-2.5 text-ink/80">{item.vendor || "—"}</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">{formatMoney(s.total, item.currency)}</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap text-teal">{formatMoney(s.paid, item.currency)}</td>
                        <td className="px-2 py-2.5 text-right font-semibold whitespace-nowrap text-forest">
                          {s.pending > 0 ? formatMoney(s.pending, item.currency) : <span className="chip bg-mint/25 text-forest">Saldado</span>}
                        </td>
                        <td className="px-4 py-2.5 sm:px-5">{s.pending > 0 ? <DueChip item={item} overdue={overdue} /> : <span className="text-ink/40">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <section aria-labelledby="payments-title" className="card p-0 sm:p-0">
        <h2 id="payments-title" className="flex items-center gap-2 border-b border-forest/8 p-4 font-semibold text-forest sm:px-5">
          <Icon name="calendar" className="h-4 w-4" />
          Pagos realizados por fecha
        </h2>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-ink/50">Todavía no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-left text-xs tracking-wide text-ink/50 uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium sm:px-5">Fecha</th>
                  <th className="px-2 py-2 font-medium">Pareja</th>
                  <th className="px-2 py-2 font-medium">Rubro / proveedor</th>
                  <th className="px-2 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-right font-medium sm:px-5">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/6">
                {payments.map(({ couple, item, payment }) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap sm:px-5">{formatDay(payment.date)}</td>
                    <td className="px-2 py-2.5">
                      <Link href={`/admin/parejas/${couple.id}/presupuesto`} className="text-forest underline-offset-4 hover:underline">
                        {coupleNames(couple)}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-ink/80">
                      {categoryName(item.category)}
                      {item.vendor && <span className="text-ink/55"> · {item.vendor}</span>}
                    </td>
                    <td className="px-2 py-2.5"><span className="chip bg-sand text-ink/70">{PAYMENT_KIND[payment.kind]}</span></td>
                    <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap text-forest sm:px-5">{formatMoney(payment.amount, payment.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
