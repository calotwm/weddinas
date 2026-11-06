import { dueItems } from "./budget";
import { categoryName } from "./brief-catalog";
import { coupleNames, isPresented, type Couple } from "./couple";
import type { Currency, IpcSeries } from "./money";
import { daysAgo, presentedAt } from "./notifications";

/** Days a presented proposal can wait for an answer before the team is alerted. */
export const PROPOSAL_ALERT_DAYS = 7;
/** Payments due within this many days (or overdue) raise an alert. */
export const PAYMENT_ALERT_DAYS = 7;

interface AlertBase {
  coupleId: string;
  names: string;
  /** Id of the proposal, budget item or task. */
  id: string;
  title: string;
}

export type CoupleAlert =
  | (AlertBase & { kind: "payment"; amount: number; currency: Currency; dueDate: string; overdue: boolean })
  | (AlertBase & { kind: "proposal"; days: number })
  | (AlertBase & { kind: "task"; month: string });

type AlertCouple = Pick<Couple, "id" | "partnerA" | "partnerB" | "proposals" | "tasks" | "budget">;

const plusDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * What the team should look at: payments due within a week or overdue, proposals waiting for an answer
 * for a week or more, and open checklist tasks of past months. `today` is "YYYY-MM-DD" (Buenos Aires).
 */
export function coupleAlerts(couples: AlertCouple[], today: string, now: Date, ipc: IpcSeries | null = null): CoupleAlert[] {
  const payments: Extract<CoupleAlert, { kind: "payment" }>[] = [];
  const proposals: Extract<CoupleAlert, { kind: "proposal" }>[] = [];
  const tasks: Extract<CoupleAlert, { kind: "task" }>[] = [];
  const thisMonth = today.slice(0, 7);

  for (const c of couples) {
    const base = { coupleId: c.id, names: coupleNames(c) };

    for (const { item, pending, overdue } of dueItems(c.budget.items, ipc, today, plusDays(today, PAYMENT_ALERT_DAYS))) {
      payments.push({ kind: "payment", ...base, id: item.id, title: item.vendor || categoryName(item.category), amount: pending, currency: item.currency, dueDate: item.dueDate!, overdue });
    }

    for (const p of c.proposals) {
      if (!isPresented(p) || p.status !== "pending") continue;
      const days = daysAgo(presentedAt(p), now);
      if (days >= PROPOSAL_ALERT_DAYS) proposals.push({ kind: "proposal", ...base, id: p.id, title: p.title, days });
    }

    for (const t of c.tasks) {
      // `month` ("YYYY-MM") is optional on checklist tasks; read defensively.
      const month = (t as { month?: string }).month;
      if (!t.done && month && month < thisMonth) tasks.push({ kind: "task", ...base, id: t.id, title: t.title, month });
    }
  }

  payments.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  proposals.sort((a, b) => b.days - a.days);
  tasks.sort((a, b) => a.month.localeCompare(b.month));
  return [...payments, ...proposals, ...tasks];
}
