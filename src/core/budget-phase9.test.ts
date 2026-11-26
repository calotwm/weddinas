import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { budgetStage, orderByStage, paymentFiles, rubroReceipts, summarizeBudget, summarizeItem } from "./budget";
import type { BudgetItem, Payment } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const pay = (over: Partial<Payment> = {}): Payment => ({ id: "p", date: "2026-06-10", amount: 1000, currency: "ARS", arsPerUsd: null, kind: "sena", note: "", ...over });

const item = (over: Partial<BudgetItem>): BudgetItem => ({
  id: "i",
  category: "catering",
  vendor: "Vendor",
  concept: "",
  amount: 1000,
  currency: "ARS",
  adjustment: "frozen",
  baseMonth: "2026-06",
  note: "",
  payments: [],
  ...over,
});

describe("budget stages (S9)", () => {
  it("an item without vendor is an estimate, one with a balance is pending, one paid in full is paid", () => {
    expect(budgetStage(item({ vendor: "  " }), null)).toBe("estimate");
    expect(budgetStage(item({}), null)).toBe("pending");
    expect(budgetStage(item({ payments: [pay()] }), null)).toBe("paid");
  });

  it("orders estimates first, then pending, then paid, each group keeping its order", () => {
    const paid = item({ id: "paid", payments: [pay()] });
    const owing1 = item({ id: "owing1" });
    const estimate = item({ id: "estimate", vendor: "" });
    const owing2 = item({ id: "owing2" });
    expect(orderByStage([paid, owing1, estimate, owing2], null).map((i) => i.id)).toEqual(["estimate", "owing1", "owing2", "paid"]);
  });
});

describe("additional charges to pay (S11)", () => {
  it("adds them to the total and leaves them in the balance until paid", () => {
    const withCharge = item({ payments: [pay()], charges: [{ id: "c", concept: "Hora extra", amount: 300 }] });
    expect(summarizeItem(withCharge, null)).toMatchObject({ paid: 1000, pending: 300, total: 1300 });
    expect(budgetStage(withCharge, null)).toBe("pending");
    expect(summarizeBudget([withCharge], null, null)).toMatchObject({ totalArs: 1300, pendingArs: 300 });
    expect(summarizeItem(item({ payments: [pay(), pay({ id: "p2", amount: 300, kind: "adicional" })], charges: [{ id: "c", concept: "", amount: 300 }] }), null).pending).toBe(0);
  });
});

describe("payment files (S10)", () => {
  it("lists every file of a payment, and every file of a rubro for the brief", () => {
    const p = pay({ receiptId: "00000000-0000-4000-8000-00000000000a.pdf", receiptIds: ["00000000-0000-4000-8000-00000000000b.png", "00000000-0000-4000-8000-00000000000c.pdf"] });
    expect(paymentFiles(p)).toEqual(["00000000-0000-4000-8000-00000000000a.pdf", "00000000-0000-4000-8000-00000000000b.png", "00000000-0000-4000-8000-00000000000c.pdf"]);
    expect(paymentFiles(pay())).toEqual([]);
    expect(rubroReceipts([item({ payments: [p] })], "catering").map((r) => r.receiptId)).toEqual(["00000000-0000-4000-8000-00000000000a.pdf", "00000000-0000-4000-8000-00000000000b.png", "00000000-0000-4000-8000-00000000000c.pdf"]);
  });
});

describe("budget service (S10, S11)", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;
  let itemId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-budget9-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
    ({ id: itemId } = await service.addBudgetItem(coupleId, { category: "catering", vendor: "X", concept: "", amount: 1000, currency: "ARS", adjustment: "frozen", baseMonth: "2026-11", note: "" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const stored = async () => (await service.getCouple(coupleId))!.budget.items[0];

  it("adds several files to one payment and returns all of them when the payment or item is deleted", async () => {
    const payment = await service.addPayment(coupleId, itemId, { date: "2026-11-01", amount: 500, currency: "ARS", arsPerUsd: null, kind: "sena", note: "", receiptId: "00000000-0000-4000-8000-00000000000a.pdf", receiptIds: ["00000000-0000-4000-8000-00000000000b.png"] });
    await service.addPaymentFile(coupleId, itemId, payment.id, "00000000-0000-4000-8000-00000000000c.pdf");
    expect(paymentFiles((await stored()).payments[0])).toEqual(["00000000-0000-4000-8000-00000000000a.pdf", "00000000-0000-4000-8000-00000000000b.png", "00000000-0000-4000-8000-00000000000c.pdf"]);

    expect(await service.removePaymentFile(coupleId, itemId, payment.id, "00000000-0000-4000-8000-00000000000a.pdf")).toBe("00000000-0000-4000-8000-00000000000a.pdf");
    expect(paymentFiles((await stored()).payments[0])).toEqual(["00000000-0000-4000-8000-00000000000b.png", "00000000-0000-4000-8000-00000000000c.pdf"]);
    expect(await service.removePaymentFile(coupleId, itemId, payment.id, "00000000-0000-4000-8000-0000000000zz.pdf")).toBeNull();

    expect(await service.deletePayment(coupleId, itemId, payment.id)).toEqual(["00000000-0000-4000-8000-00000000000b.png", "00000000-0000-4000-8000-00000000000c.pdf"]);
    const second = await service.addPayment(coupleId, itemId, { date: "2026-11-02", amount: 1, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "" });
    await service.addPaymentFile(coupleId, itemId, second.id, "00000000-0000-4000-8000-00000000000d.pdf");
    expect(await service.deleteBudgetItem(coupleId, itemId)).toEqual(["00000000-0000-4000-8000-00000000000d.pdf"]);
  });

  it("rejects a file that is not an uploaded image or PDF", async () => {
    const payment = await service.addPayment(coupleId, itemId, { date: "2026-11-01", amount: 500, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" });
    await expect(service.addPaymentFile(coupleId, itemId, payment.id, "../x")).rejects.toThrow();
    await expect(service.addPayment(coupleId, itemId, { date: "2026-11-01", amount: 1, currency: "ARS", arsPerUsd: null, kind: "sena", note: "", receiptIds: ["00000000-0000-4000-8000-0000000000ee.xlsx"] })).rejects.toThrow();
  });

  it("adds and removes additional charges to pay, kept when the item is edited", async () => {
    await service.addBudgetCharge(coupleId, itemId, { concept: " Hora extra ", amount: 300 });
    let saved = await stored();
    expect(saved.charges).toMatchObject([{ concept: "Hora extra", amount: 300 }]);
    await service.updateBudgetItem(coupleId, itemId, { category: "catering", vendor: "Y", concept: "", amount: 1000, currency: "ARS", adjustment: "frozen", baseMonth: "2026-11", note: "" });
    saved = await stored();
    expect(saved.charges).toHaveLength(1);
    await expect(service.addBudgetCharge(coupleId, itemId, { concept: "", amount: 0 })).rejects.toThrow();
    await service.deleteBudgetCharge(coupleId, itemId, saved.charges![0].id);
    expect((await stored()).charges).toEqual([]);
  });
});
