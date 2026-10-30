import "server-only";
import type { IpcSeries, UsdQuote } from "@/core/money";
import { rates } from "./container";

export interface RatesSnapshot {
  ipc: IpcSeries | null;
  quotes: UsdQuote[];
  /** The couple's chosen quote, falling back to the first one available. */
  quote: UsdQuote | null;
}

export async function loadRates(usdQuote: string): Promise<RatesSnapshot> {
  const [ipc, quotes] = await Promise.all([rates.ipc(), rates.usdQuotes()]);
  return { ipc, quotes, quote: quotes.find((q) => q.kind === usdQuote) ?? quotes[0] ?? null };
}
