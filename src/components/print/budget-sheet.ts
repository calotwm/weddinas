import { summarizeItem } from "@/core/budget";
import type { BudgetItem } from "@/core/couple";
import type { Currency, IpcSeries } from "@/core/money";

export interface BudgetSheetRow {
  id: string;
  category: string;
  vendor: string;
  currency: Currency;
  total: number;
  paid: number;
  pending: number;
}

export interface BudgetSheetTotal {
  currency: Currency;
  total: number;
  paid: number;
  pending: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The printed budget: every item in its own currency (IPC-adjusted like the budget page) and one total per currency used. */
export function budgetSheet(items: BudgetItem[], ipc: IpcSeries | null): { rows: BudgetSheetRow[]; totals: BudgetSheetTotal[] } {
  const rows = items.map((item) => {
    const s = summarizeItem(item, ipc);
    return { id: item.id, category: item.category, vendor: item.vendor, currency: item.currency, total: s.total, paid: s.paid, pending: s.pending };
  });
  const totals: BudgetSheetTotal[] = [];
  for (const currency of ["ARS", "USD"] as const) {
    const own = rows.filter((r) => r.currency === currency);
    if (own.length === 0) continue;
    const sum = (key: "total" | "paid" | "pending") => round2(own.reduce((acc, r) => acc + r[key], 0));
    totals.push({ currency, total: sum("total"), paid: sum("paid"), pending: sum("pending") });
  }
  return { rows, totals };
}
