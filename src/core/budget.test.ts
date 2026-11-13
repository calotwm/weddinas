import { describe, expect, it } from "vitest";
import {
  briefPaymentDetail,
  briefPaymentLabel,
  dueItems,
  isFullyPaid,
  paidLast,
  paidVsPending,
  rubroReceipts,
  splitPaid,
  summarizeBudget,
  summarizeItem,
  tracksConfirmedGuests,
} from "./budget";
import type { BudgetItem } from "./couple";
import type { IpcSeries } from "./money";

const ipc: IpcSeries = {
  points: [
    { month: "2026-06", value: 100 },
    { month: "2026-08", value: 110 },
  ],
};

const item = (over: Partial<BudgetItem>): BudgetItem => ({
  id: "i",
  category: "catering",
  vendor: "Vendor",
  concept: "Servicio",
  amount: 1000,
  currency: "ARS",
  adjustment: "frozen",
  baseMonth: "2026-06",
  note: "",
  payments: [],
  ...over,
});

describe("summarizeItem", () => {
  it("adjusts only the pending ARS balance by IPC", () => {
    const s = summarizeItem(
      item({ adjustment: "ipc", payments: [{ id: "p", date: "2026-06-10", amount: 400, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" }] }),
      ipc,
    );
    expect(s).toEqual({ paid: 400, pendingNominal: 600, pending: 660, total: 1060, ipcMonth: "2026-08" });
  });

  it("does not adjust frozen or USD items", () => {
    expect(summarizeItem(item({}), ipc).pending).toBe(1000);
    expect(summarizeItem(item({ currency: "USD", adjustment: "ipc" }), ipc).pending).toBe(1000);
  });

  it("counts a payment in another currency at the payment's exchange rate", () => {
    const s = summarizeItem(
      item({ currency: "USD", amount: 2000, payments: [{ id: "p", date: "2026-06-10", amount: 1_500_000, currency: "ARS", arsPerUsd: 1500, kind: "sena", note: "" }] }),
      ipc,
    );
    expect(s.paid).toBe(1000);
    expect(s.pending).toBe(1000);
  });

  it("never reports a negative balance when overpaid", () => {
    const s = summarizeItem(item({ payments: [{ id: "p", date: "2026-06-10", amount: 1200, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "" }] }), ipc);
    expect(s.pending).toBe(0);
  });
});

describe("summarizeBudget", () => {
  it("rolls items up per category and totals both currencies at the quote", () => {
    const summary = summarizeBudget(
      [
        item({ id: "a", category: "catering", amount: 3000, currency: "ARS" }),
        item({ id: "b", category: "catering", amount: 2, currency: "USD" }),
        item({ id: "c", category: "foto", amount: 1, currency: "USD", payments: [{ id: "p", date: "2026-07-01", amount: 1, currency: "USD", arsPerUsd: null, kind: "saldo", note: "" }] }),
      ],
      ipc,
      1000,
    );
    expect(summary.categories.map((c) => [c.category, c.totalArs, c.paidArs, c.pendingArs])).toEqual([
      ["catering", 5000, 0, 5000],
      ["foto", 1000, 1000, 0],
    ]);
    expect(summary.totalArs).toBe(6000);
    expect(summary.totalUsd).toBe(6);
    expect(summary.paidArs).toBe(1000);
    expect(summary.pendingUsd).toBe(5);
  });

  it("leaves a total null only when it needs a conversion and there is no dollar quote", () => {
    const summary = summarizeBudget([item({ currency: "USD", amount: 5 })], ipc, null);
    expect(summary.totalArs).toBeNull();
    expect(summary.totalUsd).toBe(5);
  });
});

describe("dueItems", () => {
  it("lists items with a balance due by the cutoff, earliest first, flagging overdue ones", () => {
    const items = [
      item({ id: "later", dueDate: "2026-12-10" }),
      item({ id: "soon", dueDate: "2026-11-20" }),
      item({ id: "late", dueDate: "2026-11-01" }),
      item({ id: "none" }),
      item({ id: "paid", dueDate: "2026-11-15", payments: [{ id: "p", date: "2026-11-02", amount: 1000, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "" }] }),
    ];
    expect(dueItems(items, null, "2026-11-06", "2026-11-30").map((d) => [d.item.id, d.pending, d.overdue])).toEqual([
      ["late", 1000, true],
      ["soon", 1000, false],
    ]);
  });
});

describe("isFullyPaid", () => {
  it("is true only when nothing is left to pay", () => {
    expect(isFullyPaid(item({}), null)).toBe(false);
    expect(isFullyPaid(item({ payments: [{ id: "p", date: "2026-06-10", amount: 1000, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "" }] }), null)).toBe(true);
  });
});

describe("paidLast", () => {
  it("moves fully paid items to the end keeping the rest in order", () => {
    const paid = item({ id: "paid", payments: [{ id: "p", date: "2026-06-10", amount: 1000, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "" }] });
    expect(paidLast([paid, item({ id: "a" }), item({ id: "b" })], null).map((i) => i.id)).toEqual(["a", "b", "paid"]);
  });
});

const pay = (amount: number, currency: "ARS" | "USD" = "ARS") => ({ id: `p${amount}`, date: "2026-06-10", amount, currency, arsPerUsd: null, kind: "sena" as const, note: "" });

describe("paidVsPending", () => {
  it("splits the budget total in USD into what was paid and what is left", () => {
    const items = [item({ currency: "USD", amount: 1000, payments: [pay(250, "USD")] }), item({ id: "b", currency: "USD", amount: 1000 })];
    expect(paidVsPending(summarizeBudget(items, null, null))).toEqual({ paid: 250, pending: 1750, paidPercent: 13 });
  });

  it("is null without a total or when USD totals need a missing quote", () => {
    expect(paidVsPending(summarizeBudget([], null, null))).toBeNull();
    expect(paidVsPending(summarizeBudget([item({})], null, null))).toBeNull();
  });
});

describe("splitPaid", () => {
  it("separates items with a balance from fully paid ones, keeping order", () => {
    const paid = item({ id: "paid", payments: [pay(1000)] });
    const split = splitPaid([paid, item({ id: "a" }), item({ id: "b" })], null);
    expect(split.owing.map((i) => i.id)).toEqual(["a", "b"]);
    expect(split.paid.map((i) => i.id)).toEqual(["paid"]);
  });
});

describe("briefPaymentLabel", () => {
  const fmt = (n: number, c: "ARS" | "USD") => `${c} ${n}`;

  it("is null when the budget has no item for the rubro", () => {
    expect(briefPaymentLabel([item({ category: "dj" })], "catering", null, fmt)).toBeNull();
  });

  it("says fully paid when every item of the rubro is paid", () => {
    expect(briefPaymentLabel([item({ payments: [pay(1000)] })], "catering", null, fmt)).toBe("Pago al 100%");
  });

  it("shows paid of total per currency, adding up the rubro's items", () => {
    const items = [
      item({ currency: "USD", amount: 1000, payments: [pay(300, "USD")] }),
      item({ id: "b", currency: "USD", amount: 500 }),
      item({ id: "c", amount: 2000, payments: [pay(500)] }),
      item({ id: "d", category: "dj", currency: "USD", amount: 9000 }),
    ];
    expect(briefPaymentLabel(items, "catering", null, fmt)).toBe("Pagado USD 300 de USD 1500 · Pagado ARS 500 de ARS 2000");
  });
});

describe("briefPaymentDetail", () => {
  const fmt = (n: number, c: "ARS" | "USD") => `${c} ${n}`;

  it("says no payments were loaded when the budget has no item for the rubro", () => {
    expect(briefPaymentDetail([item({ category: "dj" })], "catering", null, fmt)).toBe("Sin pagos cargados");
    expect(briefPaymentDetail([], "custom-fuegos", null, fmt)).toBe("Sin pagos cargados");
  });

  it("is the budget's payment label when the rubro has items", () => {
    expect(briefPaymentDetail([item({ payments: [pay(1000)] })], "catering", null, fmt)).toBe("Pago al 100%");
    expect(briefPaymentDetail([item({ payments: [pay(300)] })], "catering", null, fmt)).toBe("Pagado ARS 300 de ARS 1000");
  });
});

describe("rubroReceipts", () => {
  it("lists the receipts of every payment of the rubro's items, oldest first", () => {
    const items = [
      item({ payments: [{ ...pay(100), id: "a", date: "2026-08-01", receiptId: "r-a.pdf" }, { ...pay(200), id: "b", date: "2026-07-01" }] }),
      item({ id: "second", payments: [{ ...pay(300), id: "c", date: "2026-06-01", receiptId: "r-c.jpg" }] }),
      item({ id: "other", category: "dj", payments: [{ ...pay(400), id: "d", receiptId: "r-d.pdf" }] }),
    ];
    expect(rubroReceipts(items, "catering")).toEqual([
      { paymentId: "c", date: "2026-06-01", receiptId: "r-c.jpg" },
      { paymentId: "a", date: "2026-08-01", receiptId: "r-a.pdf" },
    ]);
    expect(rubroReceipts(items, "barra")).toEqual([]);
  });
});

describe("confirmed guests rubros", () => {
  it("are Espacio, Catering, Barra and Ambientación only", () => {
    expect(["espacio", "catering", "barra", "ambientacion"].every(tracksConfirmedGuests)).toBe(true);
    expect(["dj", "foto", "custom-fuegos", "evento"].some(tracksConfirmedGuests)).toBe(false);
  });
});
