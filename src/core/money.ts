export type Currency = "ARS" | "USD";

/** "ipc": ARS balance updated with inflation; "frozen": the agreed amount never changes. */
export type Adjustment = "ipc" | "frozen";

/** Monthly INDEC IPC index, months as "YYYY-MM", oldest first. */
export interface IpcSeries {
  points: Array<{ month: string; value: number }>;
}

/** A dollar quote: how many ARS one USD costs. */
export interface UsdQuote {
  kind: string;
  label: string;
  sell: number;
  updatedAt: string;
}

export interface AdjustableAmount {
  amount: number;
  currency: Currency;
  adjustment: Adjustment;
  /** Month the amount was agreed ("YYYY-MM"); the IPC adjustment starts there. */
  baseMonth: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function ipcFactor(series: IpcSeries | null, baseMonth: string): { factor: number; latestMonth: string | null } {
  if (!series || series.points.length === 0) return { factor: 1, latestMonth: null };
  const latest = series.points[series.points.length - 1];
  if (baseMonth >= latest.month) return { factor: 1, latestMonth: latest.month };
  const base = [...series.points].reverse().find((p) => p.month <= baseMonth) ?? series.points[0];
  return { factor: latest.value / base.value, latestMonth: latest.month };
}

export function adjustedAmount(item: AdjustableAmount, series: IpcSeries | null): number {
  if (item.currency !== "ARS" || item.adjustment !== "ipc") return item.amount;
  return round2(item.amount * ipcFactor(series, item.baseMonth).factor);
}

/** Converts with `arsPerUsd`; null when a cross-currency conversion has no quote. */
export function convert(amount: number, from: Currency, to: Currency, arsPerUsd: number | null): number | null {
  if (from === to) return amount;
  if (!arsPerUsd) return null;
  return round2(from === "USD" ? amount * arsPerUsd : amount / arsPerUsd);
}
