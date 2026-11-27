import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dueItems, nextDueDate, summarizeBudget, summarizeItem } from "./budget";
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

describe("extra payments: Adicional, Viáticos, Fletes (S5, S7)", () => {
  it("add to the total and are paid at once, so the balance stays the same", () => {
    for (const kind of ["adicional", "viaticos", "fletes"] as const) {
      const s = summarizeItem(item({ payments: [pay({ amount: 400 }), pay({ id: "x", amount: 200, kind })] }), null);
      expect(s).toMatchObject({ paid: 600, pending: 600, total: 1200 });
    }
    expect(summarizeBudget([item({ payments: [pay({ amount: 200, kind: "adicional" })] })], null, null)).toMatchObject({ totalArs: 1200, pendingArs: 1000 });
  });

  it("a regular payment still pays down the agreed amount", () => {
    expect(summarizeItem(item({ payments: [pay({ amount: 400, kind: "saldo" })] }), null)).toMatchObject({ paid: 400, pending: 600, total: 1000 });
  });
});

describe("payments planned for later (S9)", () => {
  it("are not paid yet: a planned regular payment leaves the balance, a planned extra adds to it", () => {
    expect(summarizeItem(item({ payments: [pay({ planned: true })] }), null)).toMatchObject({ paid: 0, pending: 1000, total: 1000 });
    expect(summarizeItem(item({ payments: [pay({ planned: true, kind: "fletes", amount: 150 })] }), null)).toMatchObject({ paid: 0, pending: 1150, total: 1150 });
  });

  it("their date is the item's next due date when it comes first", () => {
    const planned = item({ dueDate: "2026-09-01", payments: [pay({ planned: true, date: "2026-07-15" }), pay({ id: "done", date: "2026-06-01", amount: 200 })] });
    expect(nextDueDate(planned)).toBe("2026-07-15");
    expect(nextDueDate(item({ dueDate: "2026-07-01", payments: [pay({ planned: true, date: "2026-07-15" })] }))).toBe("2026-07-01");
    expect(nextDueDate(item({}))).toBeUndefined();
    expect(dueItems([planned], null, "2026-07-10", "2026-07-31").map((d) => d.dueDate)).toEqual(["2026-07-15"]);
  });
});

describe("budget service (phase 10)", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;
  let itemId: string;
  const stored = async () => (await service.getCouple(coupleId))!.budget.items.find((i) => i.id === itemId)!;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-budget10-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    coupleId = (await service.createCouple({ partnerA: "Ana", partnerB: "Beto", weddingDate: "2027-03-20T18:00" })).couple.id;
    itemId = (await service.addBudgetItem(coupleId, { category: "catering", vendor: "Vendor", concept: "", amount: 1000, currency: "ARS", adjustment: "frozen", baseMonth: "2026-06", note: "" })).id;
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("takes amount 0 for items and payments (S10), never a negative one", async () => {
    const free = await service.addBudgetItem(coupleId, { category: "foto", vendor: "", concept: "", amount: 0, currency: "ARS", adjustment: "frozen", baseMonth: "2026-06", note: "" });
    expect(free.amount).toBe(0);
    expect((await service.addPayment(coupleId, itemId, { date: "2026-06-01", amount: 0, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" })).amount).toBe(0);
    await expect(service.addPayment(coupleId, itemId, { date: "2026-06-01", amount: -1, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" })).rejects.toThrow();
  });

  it("records Viáticos and Fletes payments and planned ones, then marks a planned one paid", async () => {
    const fletes = await service.addPayment(coupleId, itemId, { date: "2026-06-01", amount: 100, currency: "ARS", arsPerUsd: null, kind: "fletes", note: "" });
    expect(fletes.kind).toBe("fletes");
    const later = await service.addPayment(coupleId, itemId, { date: "2026-08-01", amount: 500, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "", planned: true });
    expect((await stored()).payments.find((p) => p.id === later.id)?.planned).toBe(true);
    await service.markPaymentPaid(coupleId, itemId, later.id, "2026-07-20");
    const paid = (await stored()).payments.find((p) => p.id === later.id)!;
    expect(paid.planned).toBeUndefined();
    expect(paid.date).toBe("2026-07-20");
  });

  it("pays an additional charge: it becomes an Adicional payment and the balance drops by it", async () => {
    const charge = await service.addBudgetCharge(coupleId, itemId, { concept: "Hora extra", amount: 300 });
    expect(summarizeItem(await stored(), null)).toMatchObject({ pending: 1300, total: 1300 });
    await service.payBudgetCharge(coupleId, itemId, charge.id, "2026-07-01");
    const after = await stored();
    expect(after.charges ?? []).toEqual([]);
    expect(after.payments).toMatchObject([{ kind: "adicional", amount: 300, date: "2026-07-01", note: "Hora extra" }]);
    expect(summarizeItem(after, null)).toMatchObject({ paid: 300, pending: 1000, total: 1300 });
  });
});

describe("item form: new rubros and fletes (S6, S8)", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-budget10b-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    coupleId = (await service.createCouple({ partnerA: "Ana", partnerB: "Beto", weddingDate: "2027-03-20T18:00" })).couple.id;
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("adds a rubro by its name, or reuses the one with that name", async () => {
    const key = await service.ensureRubro(coupleId, "Fuegos artificiales");
    expect(await service.ensureRubro(coupleId, " fuegos  ARTIFICIALES ")).toBe(key);
    expect(await service.ensureRubro(coupleId, "Catering")).toBe("catering");
    const item = await service.addBudgetItem(coupleId, { category: key, vendor: "", concept: "", amount: 0, currency: "ARS", adjustment: "frozen", baseMonth: "2026-06", note: "" });
    expect(item.category).toBe(key);
    await expect(service.ensureRubro(coupleId, "  ")).rejects.toThrow();
  });

  it("keeps several fletes with what each one is for; paying one records a Fletes payment", async () => {
    const item = await service.addBudgetItem(coupleId, { category: "catering", vendor: "V", concept: "", amount: 1000, currency: "ARS", adjustment: "frozen", baseMonth: "2026-06", note: "" });
    const ida = await service.addBudgetCharge(coupleId, item.id, { concept: "Flete vajilla", amount: 100, kind: "fletes" });
    await service.addBudgetCharge(coupleId, item.id, { concept: "Flete mobiliario", amount: 200, kind: "fletes" });
    let saved = (await service.getCouple(coupleId))!.budget.items[0];
    expect(saved.charges?.map((c) => [c.concept, c.kind])).toEqual([["Flete vajilla", "fletes"], ["Flete mobiliario", "fletes"]]);
    expect(summarizeItem(saved, null)).toMatchObject({ total: 1300, pending: 1300 });
    await service.payBudgetCharge(coupleId, item.id, ida.id, "2026-07-01");
    saved = (await service.getCouple(coupleId))!.budget.items[0];
    expect(saved.payments.map((p) => p.kind)).toEqual(["fletes"]);
    expect(summarizeItem(saved, null)).toMatchObject({ total: 1300, pending: 1200 });
  });
});
