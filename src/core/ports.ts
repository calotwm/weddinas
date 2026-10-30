import type { Couple } from "./couple";
import type { IpcSeries, UsdQuote } from "./money";

export interface CoupleRepository {
  list(): Promise<Couple[]>;
  findById(id: string): Promise<Couple | null>;
  findBySlug(slug: string): Promise<Couple | null>;
  findByAccessCodeHash(hash: string): Promise<Couple | null>;
  save(couple: Couple): Promise<void>;
}

export interface RatesProvider {
  /** Latest INDEC IPC series, or null when unavailable. */
  ipc(): Promise<IpcSeries | null>;
  /** Current dollar quotes, or an empty list when unavailable. */
  usdQuotes(): Promise<UsdQuote[]>;
}
