import type { BudgetItem } from "./couple";
import { adjustedAmount, convert, ipcFactor, type IpcSeries } from "./money";

export interface ItemSummary {
  /** All amounts in the item's currency. */
  paid: number;
  pendingNominal: number;
  /** Pending balance after the IPC adjustment (equals pendingNominal when not adjusted). */
  pending: number;
  total: number;
  /** IPC month used for the adjustment, when the item is adjusted. */
  ipcMonth: string | null;
}

export interface CategorySummary {
  category: string;
  totalArs: number | null;
  paidArs: number | null;
  pendingArs: number | null;
  totalUsd: number | null;
  paidUsd: number | null;
  pendingUsd: number | null;
}

export interface BudgetSummary {
  categories: CategorySummary[];
  totalArs: number | null;
  totalUsd: number | null;
  paidArs: number | null;
  paidUsd: number | null;
  pendingArs: number | null;
  pendingUsd: number | null;
  ipcMonth: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeItem(item: BudgetItem, ipc: IpcSeries | null): ItemSummary {
  const paid = round2(
    item.payments.reduce((sum, p) => sum + (convert(p.amount, p.currency, item.currency, p.arsPerUsd) ?? 0), 0),
  );
  const pendingNominal = Math.max(0, round2(item.amount - paid));
  const pending = adjustedAmount({ ...item, amount: pendingNominal }, ipc);
  const adjusted = item.currency === "ARS" && item.adjustment === "ipc";
  return {
    paid,
    pendingNominal,
    pending,
    total: round2(paid + pending),
    ipcMonth: adjusted ? ipcFactor(ipc, item.baseMonth).latestMonth : null,
  };
}

/** Sums ARS and USD amounts into one currency; null when a USD/ARS part needs a missing quote. */
function sumIn(target: "ARS" | "USD", ars: number, usd: number, arsPerUsd: number | null): number | null {
  const own = target === "ARS" ? ars : usd;
  const other = target === "ARS" ? usd : ars;
  if (other === 0) return round2(own);
  const converted = convert(other, target === "ARS" ? "USD" : "ARS", target, arsPerUsd);
  return converted === null ? null : round2(own + converted);
}

interface Bucket {
  total: [number, number];
  paid: [number, number];
  pending: [number, number];
}

const emptyBucket = (): Bucket => ({ total: [0, 0], paid: [0, 0], pending: [0, 0] });

export function summarizeBudget(items: BudgetItem[], ipc: IpcSeries | null, arsPerUsd: number | null): BudgetSummary {
  const byCategory = new Map<string, Bucket>();
  const all = emptyBucket();
  let ipcMonth: string | null = null;

  for (const item of items) {
    const s = summarizeItem(item, ipc);
    ipcMonth ??= s.ipcMonth;
    const i = item.currency === "ARS" ? 0 : 1;
    const bucket = byCategory.get(item.category) ?? emptyBucket();
    byCategory.set(item.category, bucket);
    for (const b of [bucket, all]) {
      b.total[i] += s.total;
      b.paid[i] += s.paid;
      b.pending[i] += s.pending;
    }
  }

  return {
    categories: [...byCategory].map(([category, b]) => ({
      category,
      totalArs: sumIn("ARS", ...b.total, arsPerUsd),
      paidArs: sumIn("ARS", ...b.paid, arsPerUsd),
      pendingArs: sumIn("ARS", ...b.pending, arsPerUsd),
      totalUsd: sumIn("USD", ...b.total, arsPerUsd),
      paidUsd: sumIn("USD", ...b.paid, arsPerUsd),
      pendingUsd: sumIn("USD", ...b.pending, arsPerUsd),
    })),
    totalArs: sumIn("ARS", ...all.total, arsPerUsd),
    totalUsd: sumIn("USD", ...all.total, arsPerUsd),
    paidArs: sumIn("ARS", ...all.paid, arsPerUsd),
    paidUsd: sumIn("USD", ...all.paid, arsPerUsd),
    pendingArs: sumIn("ARS", ...all.pending, arsPerUsd),
    pendingUsd: sumIn("USD", ...all.pending, arsPerUsd),
    ipcMonth,
  };
}

export const isFullyPaid = (item: BudgetItem, ipc: IpcSeries | null) => summarizeItem(item, ipc).pending <= 0;

/** Items still being paid first, fully paid ones last; each group keeps its order. */
export const paidLast = (items: BudgetItem[], ipc: IpcSeries | null) =>
  [...items].sort((a, b) => Number(isFullyPaid(a, ipc)) - Number(isFullyPaid(b, ipc)));

export interface DueItem {
  item: BudgetItem;
  /** Pending balance in the item's currency. */
  pending: number;
  overdue: boolean;
}

/** Items with a balance due on or before `until` ("YYYY-MM-DD"), earliest first; `today` decides which are overdue. */
export function dueItems(items: BudgetItem[], ipc: IpcSeries | null, today: string, until: string): DueItem[] {
  return items
    .filter((item) => item.dueDate && item.dueDate <= until)
    .map((item) => ({ item, pending: summarizeItem(item, ipc).pending, overdue: item.dueDate! < today }))
    .filter((d) => d.pending > 0)
    .sort((a, b) => a.item.dueDate!.localeCompare(b.item.dueDate!));
}
