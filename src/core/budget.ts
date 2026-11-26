import { categoryName } from "./brief-catalog";
import type { BriefBlock, BudgetItem, Payment } from "./couple";
import { adjustedAmount, convert, ipcFactor, type Currency, type IpcSeries } from "./money";

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
  /** Row key: the item's rubros joined by "+". */
  category: string;
  /** The row's rubros, main one first (one item may cover several). */
  categories: string[];
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

/** Every file of a payment: the first receipt plus the other "archivos de pago". */
export const paymentFiles = (p: Pick<Payment, "receiptId" | "receiptIds">): string[] => [...(p.receiptId ? [p.receiptId] : []), ...(p.receiptIds ?? [])];

/** What the item costs: its amount plus the additional charges still to pay. */
const itemCost = (item: BudgetItem) => item.amount + (item.charges ?? []).reduce((sum, c) => sum + c.amount, 0);

export function summarizeItem(item: BudgetItem, ipc: IpcSeries | null): ItemSummary {
  const paid = round2(
    item.payments.reduce((sum, p) => sum + (convert(p.amount, p.currency, item.currency, p.arsPerUsd) ?? 0), 0),
  );
  const pendingNominal = Math.max(0, round2(itemCost(item) - paid));
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

/** The item's rubros, main one first. */
export const itemCategories = (item: Pick<BudgetItem, "category" | "extraCategories">): string[] => [item.category, ...(item.extraCategories ?? [])];

/** "Espacio + Catering": the names of the item's rubros. */
export const itemCategoryName = (item: Pick<BudgetItem, "category" | "extraCategories">, brief?: ReadonlyArray<Pick<BriefBlock, "key" | "name">>) =>
  itemCategories(item).map((c) => categoryName(c, brief)).join(" + ");

const coversCategory = (item: BudgetItem, category: string) => itemCategories(item).includes(category);

export function summarizeBudget(items: BudgetItem[], ipc: IpcSeries | null, arsPerUsd: number | null): BudgetSummary {
  const byCategory = new Map<string, Bucket>();
  const all = emptyBucket();
  let ipcMonth: string | null = null;

  for (const item of items) {
    const s = summarizeItem(item, ipc);
    ipcMonth ??= s.ipcMonth;
    const i = item.currency === "ARS" ? 0 : 1;
    // An item of several rubros is counted once, in a row of its own ("Espacio + Catering").
    const key = itemCategories(item).join("+");
    const bucket = byCategory.get(key) ?? emptyBucket();
    byCategory.set(key, bucket);
    for (const b of [bucket, all]) {
      b.total[i] += s.total;
      b.paid[i] += s.paid;
      b.pending[i] += s.pending;
    }
  }

  return {
    categories: [...byCategory].map(([category, b]) => ({
      category,
      categories: category.split("+"),
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

/** Viáticos charged apart from the price (freight "no") that nobody marked as paid yet. */
export const owesFreight = (item: Pick<BudgetItem, "freight" | "freightPaid">) => item.freight === "no" && !item.freightPaid;

export const isFullyPaid = (item: BudgetItem, ipc: IpcSeries | null) => summarizeItem(item, ipc).pending <= 0 && !owesFreight(item);

/** Items still being paid first, fully paid ones last; each group keeps its order. */
export const paidLast = (items: BudgetItem[], ipc: IpcSeries | null) =>
  [...items].sort((a, b) => Number(isFullyPaid(a, ipc)) - Number(isFullyPaid(b, ipc)));

/** "Estimado" (no vendor yet, yellow), "Pendiente" (a balance to pay, red) or "Pago al 100%" (green). */
export type BudgetStage = "estimate" | "pending" | "paid";

export const budgetStage = (item: BudgetItem, ipc: IpcSeries | null): BudgetStage =>
  !item.vendor.trim() ? "estimate" : isFullyPaid(item, ipc) ? "paid" : "pending";

const STAGE_ORDER: BudgetStage[] = ["estimate", "pending", "paid"];

/** Estimates first, then items with a balance, then fully paid ones; each group keeps its order. */
export const orderByStage = (items: BudgetItem[], ipc: IpcSeries | null) =>
  [...items].sort((a, b) => STAGE_ORDER.indexOf(budgetStage(a, ipc)) - STAGE_ORDER.indexOf(budgetStage(b, ipc)));

/** Items still being paid and fully paid ones, each group in its original order. */
export function splitPaid(items: BudgetItem[], ipc: IpcSeries | null): { owing: BudgetItem[]; paid: BudgetItem[] } {
  const owing: BudgetItem[] = [];
  const paid: BudgetItem[] = [];
  for (const item of items) (isFullyPaid(item, ipc) ? paid : owing).push(item);
  return { owing, paid };
}

/** The whole budget in USD split into paid and pending, for the paid-vs-pending chart; null without a USD total. */
export function paidVsPending(summary: BudgetSummary): { paid: number; pending: number; paidPercent: number } | null {
  const { paidUsd: paid, pendingUsd: pending } = summary;
  if (paid === null || pending === null || paid + pending <= 0) return null;
  return { paid, pending, paidPercent: Math.round((paid / (paid + pending)) * 100) };
}

/**
 * What the budget says about a rubro's payments, for the brief's "Pago" line: "Pago al 100%", or what was paid of the
 * total per currency. Null when the budget has no item for that rubro (the brief keeps its manual detail).
 */
export function briefPaymentLabel(
  items: BudgetItem[],
  category: string,
  ipc: IpcSeries | null,
  format: (amount: number, currency: Currency) => string,
): string | null {
  const own = items.filter((i) => coversCategory(i, category));
  if (own.length === 0) return null;
  if (own.every((i) => isFullyPaid(i, ipc))) return "Pago al 100%";
  const totals = new Map<Currency, { paid: number; total: number }>();
  for (const item of own) {
    const s = summarizeItem(item, ipc);
    const t = totals.get(item.currency) ?? { paid: 0, total: 0 };
    totals.set(item.currency, { paid: round2(t.paid + s.paid), total: round2(t.total + s.total) });
  }
  const lines = [...totals].map(([currency, t]) => `Pagado ${format(t.paid, currency)} de ${format(t.total, currency)}`);
  if (own.some(owesFreight)) lines.push("faltan viáticos");
  return lines.join(" · ");
}

export const NO_PAYMENTS_LABEL = "Sin pagos cargados";

/** The brief's "Pago" line of a vendor rubro, always from the budget: its payment label, or "Sin pagos cargados". */
export function briefPaymentDetail(
  items: BudgetItem[],
  category: string,
  ipc: IpcSeries | null,
  format: (amount: number, currency: Currency) => string,
): string {
  return briefPaymentLabel(items, category, ipc, format) ?? NO_PAYMENTS_LABEL;
}

export interface RubroReceipt {
  paymentId: string;
  /** "YYYY-MM-DD" of the payment. */
  date: string;
  receiptId: string;
}

/** Receipts of every payment of the rubro's budget items, oldest payment first, for the brief block. */
export function rubroReceipts(items: BudgetItem[], category: string): RubroReceipt[] {
  return items
    .filter((i) => coversCategory(i, category))
    .flatMap((i) => i.payments)
    .flatMap((p) => paymentFiles(p).map((receiptId) => ({ paymentId: p.id, date: p.date, receiptId })))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Rubros whose budget item records how many guests were confirmed to the vendor. */
export const CONFIRMED_GUESTS_RUBROS: readonly string[] = ["espacio", "catering", "barra", "ambientacion"];

export const tracksConfirmedGuests = (category: string) => CONFIRMED_GUESTS_RUBROS.includes(category);

/** Whether any of the item's rubros records confirmed guests. */
export const itemTracksConfirmedGuests = (item: Pick<BudgetItem, "category" | "extraCategories">) => itemCategories(item).some(tracksConfirmedGuests);

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
