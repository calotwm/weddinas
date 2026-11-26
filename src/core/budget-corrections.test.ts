import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BudgetCorrectionError, parseBudgetCorrections, type BudgetCorrection } from "./budget-corrections";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

let dir: string;
let service: PortalService;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "weddinas-corrections-"));
  service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

async function importedItem() {
  const couple = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" });
  const item = await service.addBudgetItem(couple.couple.id, {
    category: "foto", vendor: "Luz", concept: "Foto", amount: 2500, currency: "USD", adjustment: "frozen", baseMonth: "2026-06", note: "",
  });
  const payment = await service.addPayment(couple.couple.id, item.id, { date: "2026-06-10", amount: 1826500, currency: "ARS", arsPerUsd: 1405, kind: "sena", note: "Seña" });
  return { coupleId: couple.couple.id, itemId: item.id, paymentId: payment.id };
}

const correction = (coupleId: string, itemId: string): BudgetCorrection => ({
  coupleId,
  itemId,
  expect: { currency: "USD", amount: 2500, payments: [{ date: "2026-06-10", amount: 1826500, currency: "ARS", arsPerUsd: 1405 }] },
  set: { currency: "USD", amount: 2500, payments: [{ date: "2026-06-10", amount: 1300, currency: "USD", arsPerUsd: null }] },
});

describe("budget corrections", () => {
  it("rewrites an item still as imported, keeping its payments' ids, kinds and notes", async () => {
    const { coupleId, itemId, paymentId } = await importedItem();
    expect(await service.applyBudgetCorrections([correction(coupleId, itemId)])).toEqual({ applied: 1, changed: 0, missing: 0 });
    const item = (await service.getCouple(coupleId))!.budget.items[0];
    expect(item.payments).toEqual([{ id: paymentId, date: "2026-06-10", amount: 1300, currency: "USD", arsPerUsd: null, kind: "sena", note: "Seña" }]);
  });

  it("leaves an item the team edited after the import untouched", async () => {
    const { coupleId, itemId } = await importedItem();
    await service.addPayment(coupleId, itemId, { date: "2026-07-10", amount: 100, currency: "USD", arsPerUsd: null, kind: "saldo", note: "" });
    const before = JSON.stringify((await service.getCouple(coupleId))!.budget);
    expect(await service.applyBudgetCorrections([correction(coupleId, itemId), correction(coupleId, "gone")])).toEqual({ applied: 0, changed: 1, missing: 1 });
    expect(JSON.stringify((await service.getCouple(coupleId))!.budget)).toBe(before);
  });

  it("rejects a file that is not a list of valid corrections", () => {
    expect(() => parseBudgetCorrections("nope")).toThrow(BudgetCorrectionError);
    expect(() => parseBudgetCorrections(JSON.stringify([{ coupleId: "c", itemId: "i", expect: { currency: "USD", amount: 1, payments: [] }, set: { currency: "EUR", amount: 1, payments: [] } }]))).toThrow(
      BudgetCorrectionError,
    );
    expect(() =>
      parseBudgetCorrections(JSON.stringify([{ coupleId: "c", itemId: "i", expect: { currency: "USD", amount: 1, payments: [] }, set: { currency: "USD", amount: 1, payments: [{ date: "2026-01-01", amount: 5, currency: "ARS", arsPerUsd: null }] } }])),
    ).toThrow(BudgetCorrectionError);
    const ok = [correction("c", "i")];
    expect(parseBudgetCorrections(JSON.stringify(ok))).toEqual(ok);
  });
});
