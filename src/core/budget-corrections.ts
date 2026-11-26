/**
 * One-off corrections of imported budget items (for example the fixed-price fix of the sheet import). Each correction
 * names the item's money as it was imported (`expect`) and as it should be (`set`); it only applies while the item is
 * still exactly as imported, so anything the team edited afterwards is never overwritten.
 */
import type { BudgetItem } from "./couple";

type Currency = BudgetItem["currency"];

export interface CorrectionPayment {
  date: string;
  amount: number;
  currency: Currency;
  arsPerUsd: number | null;
}

export interface BudgetMoney {
  currency: Currency;
  amount: number;
  payments: CorrectionPayment[];
}

export interface BudgetCorrection {
  coupleId: string;
  itemId: string;
  expect: BudgetMoney;
  set: BudgetMoney;
}

export interface CorrectionResult {
  applied: number;
  /** Items edited after the import: left as they are. */
  changed: number;
  /** Items (or couples) that no longer exist. */
  missing: number;
}

export class BudgetCorrectionError extends Error {}

export const MAX_CORRECTIONS = 2000;

const CURRENCIES: readonly string[] = ["ARS", "USD"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const positive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const id = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 100;

function money(v: unknown): BudgetMoney {
  if (!isRecord(v) || !CURRENCIES.includes(v.currency as string) || !positive(v.amount) || !Array.isArray(v.payments)) {
    throw new BudgetCorrectionError("Each correction needs a currency, a positive amount and a payments list.");
  }
  const currency = v.currency as Currency;
  const payments = v.payments.map((p): CorrectionPayment => {
    if (!isRecord(p) || typeof p.date !== "string" || !DAY.test(p.date) || !positive(p.amount) || !CURRENCIES.includes(p.currency as string)) {
      throw new BudgetCorrectionError("Each payment needs a YYYY-MM-DD date, a positive amount and a currency.");
    }
    const arsPerUsd = p.arsPerUsd ?? null;
    if (arsPerUsd !== null && !positive(arsPerUsd)) throw new BudgetCorrectionError("A payment's exchange rate must be positive.");
    // Same rule as addPayment: a payment in the other currency needs its exchange rate.
    if (p.currency !== currency && arsPerUsd === null) throw new BudgetCorrectionError("A payment in another currency needs its exchange rate.");
    return { date: p.date, amount: p.amount as number, currency: p.currency as Currency, arsPerUsd };
  });
  return { currency, amount: v.amount as number, payments };
}

/** Parses and validates an uploaded corrections file; throws BudgetCorrectionError with the reason. */
export function parseBudgetCorrections(json: string): BudgetCorrection[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new BudgetCorrectionError("The corrections file is not valid JSON.");
  }
  if (!Array.isArray(data) || data.length > MAX_CORRECTIONS) throw new BudgetCorrectionError(`The corrections file must be a list of at most ${MAX_CORRECTIONS} corrections.`);
  return data.map((c) => {
    if (!isRecord(c) || !id(c.coupleId) || !id(c.itemId)) throw new BudgetCorrectionError("Each correction needs a coupleId and an itemId.");
    const expect = money(c.expect);
    const set = money(c.set);
    if (expect.payments.length !== set.payments.length) throw new BudgetCorrectionError("A correction keeps the item's number of payments.");
    return { coupleId: c.coupleId, itemId: c.itemId, expect, set };
  });
}

const moneyKey = (m: BudgetMoney) => JSON.stringify([m.currency, m.amount, m.payments.map((p) => [p.date, p.amount, p.currency, p.arsPerUsd ?? null])]);

/** Applies the correction when the item is still as imported (and has no receipts); false when it was edited. */
export function correctItem(item: BudgetItem, correction: BudgetCorrection): boolean {
  if (item.payments.some((p) => p.receiptId)) return false;
  if (moneyKey(item) !== moneyKey(correction.expect)) return false;
  item.currency = correction.set.currency;
  item.amount = correction.set.amount;
  item.payments = item.payments.map((p, i) => ({ ...p, ...correction.set.payments[i] }));
  return true;
}
