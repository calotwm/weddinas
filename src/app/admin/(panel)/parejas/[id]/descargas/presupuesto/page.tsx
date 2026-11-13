import { budgetSheet } from "@/components/print/budget-sheet";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { categoryName } from "@/core/brief-catalog";
import { formatMoney } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

/** Every budget item with what was paid and what is left, in its own currency, plus one total per currency. */
export default async function BudgetDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  const { ipc } = await loadRates(couple.budget.usdQuote);
  const { rows, totals } = budgetSheet(couple.budget.items, ipc);
  const cell = "py-1.5 px-3 text-right whitespace-nowrap tabular-nums";

  return (
    <PrintSheet couple={couple} title="Presupuesto" back={downloadsPath(couple.id)}>
      {rows.length === 0 ? (
        <p className="text-ink/60">Todavía no hay ítems en el presupuesto.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs tracking-wider text-ink/60 uppercase">
            <tr className="border-b border-forest/20">
              <th className="py-2 pr-3 font-semibold">Rubro</th>
              <th className="py-2 pr-3 font-semibold">Proveedor</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
              <th className="px-3 py-2 text-right font-semibold">Pagado</th>
              <th className="py-2 pl-3 text-right font-semibold">Falta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/10">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-1.5 pr-3 text-forest">{categoryName(row.category, couple.brief)}</td>
                <td className="py-1.5 pr-3">{row.vendor}</td>
                <td className={cell}>{formatMoney(row.total, row.currency)}</td>
                <td className={`${cell} text-teal`}>{formatMoney(row.paid, row.currency)}</td>
                <td className={`${cell} !pr-0 text-rust`}>{formatMoney(row.pending, row.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-forest/30 font-semibold">
            {totals.map((t) => (
              <tr key={t.currency}>
                <td colSpan={2} className="py-2 pr-3 text-forest">Total {t.currency}</td>
                <td className={cell}>{formatMoney(t.total, t.currency)}</td>
                <td className={`${cell} text-teal`}>{formatMoney(t.paid, t.currency)}</td>
                <td className={`${cell} !pr-0 text-rust`}>{formatMoney(t.pending, t.currency)}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      )}
    </PrintSheet>
  );
}
