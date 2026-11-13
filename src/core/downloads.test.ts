import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOWNLOAD_SHEETS } from "@/components/print/sheets";
import { budgetSheet } from "@/components/print/budget-sheet";
import { guestSheet } from "@/components/print/guest-sheet";
import type { BudgetItem, Guest } from "./couple";

const app = path.resolve(__dirname, "../app");

/** Every .ts/.tsx file under a directory, recursively. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("downloads", () => {
  it("S22: the couple portal has no download routes and no links to them", () => {
    expect(existsSync(path.join(app, "portal", "descargas"))).toBe(false);
    const linking = sources(path.join(app, "portal")).filter((f) => readFileSync(f, "utf8").includes("/portal/descargas"));
    expect(linking).toEqual([]);
  });

  it("S23: every team sheet has its route under the couple's Descargas tab", () => {
    const base = path.join(app, "admin", "(panel)", "parejas", "[id]", "descargas");
    expect(existsSync(path.join(base, "page.tsx"))).toBe(true);
    expect(DOWNLOAD_SHEETS.map((s) => s.slug)).toEqual(["proveedores", "invitados", "presupuesto", "timing", "familia", "musica"]);
    for (const { slug } of DOWNLOAD_SHEETS) expect(existsSync(path.join(base, slug, "page.tsx")), slug).toBe(true);
  });

  describe("S16 guest attendance sheet", () => {
    const guest = (over: Partial<Guest>): Guest => ({ id: over.name ?? "x", name: "", group: "", status: "pending", table: "", restriction: "", ...over });

    it("numbers the guests 1, 2, 3 in the team list order (last name, then name) with their columns", () => {
      const { rows } = guestSheet([
        guest({ name: "Zoe", lastName: "Pérez", table: "3", restriction: "Celíaco", status: "confirmed" }),
        guest({ name: "Ana", lastName: "Álvarez", table: "1" }),
        guest({ name: "Bruno" }),
      ]);
      expect(rows).toEqual([
        { n: 1, id: "Ana", lastName: "Álvarez", name: "Ana", table: "1", menu: "", status: "Pendiente" },
        { n: 2, id: "Bruno", lastName: "", name: "Bruno", table: "", menu: "", status: "Pendiente" },
        { n: 3, id: "Zoe", lastName: "Pérez", name: "Zoe", table: "3", menu: "Celíaco", status: "Confirmado" },
      ]);
    });

    it("totals confirmed guests over the whole list", () => {
      const sheet = guestSheet([guest({ name: "A", status: "confirmed" }), guest({ name: "B", status: "declined" }), guest({ name: "C" })]);
      expect(sheet.totals).toEqual({ confirmed: 1, total: 3 });
    });

    it("is empty without guests", () => {
      expect(guestSheet([])).toEqual({ rows: [], totals: { confirmed: 0, total: 0 } });
    });
  });

  describe("budget sheet", () => {
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
    const paid = (amount: number, currency: "ARS" | "USD" = "ARS") => ({ id: "p", date: "2026-06-10", amount, currency, arsPerUsd: null, kind: "sena" as const, note: "" });

    it("lists each item with total, paid and pending in its own currency, and totals per currency", () => {
      const sheet = budgetSheet(
        [
          item({ id: "a", category: "catering", vendor: "Softies", payments: [paid(400)] }),
          item({ id: "b", category: "dj", vendor: "DJ Uno", amount: 500, currency: "USD", payments: [paid(500, "USD")] }),
          item({ id: "c", category: "salon", vendor: "", amount: 2000 }),
        ],
        null,
      );
      expect(sheet.rows).toEqual([
        { id: "a", category: "catering", vendor: "Softies", currency: "ARS", total: 1000, paid: 400, pending: 600 },
        { id: "b", category: "dj", vendor: "DJ Uno", currency: "USD", total: 500, paid: 500, pending: 0 },
        { id: "c", category: "salon", vendor: "", currency: "ARS", total: 2000, paid: 0, pending: 2000 },
      ]);
      expect(sheet.totals).toEqual([
        { currency: "ARS", total: 3000, paid: 400, pending: 2600 },
        { currency: "USD", total: 500, paid: 500, pending: 0 },
      ]);
    });

    it("has no totals without items", () => {
      expect(budgetSheet([], null)).toEqual({ rows: [], totals: [] });
    });
  });
});
