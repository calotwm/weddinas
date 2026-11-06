import { describe, expect, it } from "vitest";
import type { Guest } from "./couple";
import { guestSummary, parseGuestNames } from "./guests";

const guest = (over: Partial<Guest>): Guest => ({ id: "x", name: "N", group: "", status: "pending", table: "", restriction: "", ...over });

describe("guest summary", () => {
  it("counts confirmed guests over the ones still invited (declined guests do not count)", () => {
    const summary = guestSummary([
      guest({ status: "confirmed" }),
      guest({ status: "confirmed" }),
      guest({ status: "confirmed" }),
      guest({ status: "pending" }),
      guest({ status: "declined" }),
    ]);
    expect(summary).toMatchObject({ total: 5, confirmed: 3, pending: 1, declined: 1, expected: 4, confirmedPercent: 75 });
  });

  it("is zero percent for an empty list", () => {
    expect(guestSummary([])).toEqual({ total: 0, confirmed: 0, pending: 0, declined: 0, expected: 0, confirmedPercent: 0, tables: [], unseated: 0, restrictions: [] });
  });

  it("groups tables and restrictions of guests still invited, case-insensitively, sorted", () => {
    const summary = guestSummary([
      guest({ table: "Mesa 2", restriction: "Celíaco" }),
      guest({ table: "mesa 2 ", restriction: "celíaco" }),
      guest({ table: "Mesa 1", restriction: "Vegano" }),
      guest({ table: "", restriction: "" }),
      guest({ table: "Mesa 1", restriction: "Vegano", status: "declined" }),
    ]);
    expect(summary.tables).toEqual([
      { name: "Mesa 1", count: 1 },
      { name: "Mesa 2", count: 2 },
    ]);
    expect(summary.unseated).toBe(1);
    expect(summary.restrictions).toEqual([
      { name: "Celíaco", count: 2 },
      { name: "Vegano", count: 1 },
    ]);
  });

  it("sorts numbered tables naturally", () => {
    const summary = guestSummary([guest({ table: "10" }), guest({ table: "2" })]);
    expect(summary.tables.map((t) => t.name)).toEqual(["2", "10"]);
  });
});

describe("pasted guest names", () => {
  it("takes one name per line, trimming and skipping blank lines and list bullets", () => {
    expect(parseGuestNames("  Ana Pérez \n\n- Juan\r\n• Sofi\n2. Tomás\n   ")).toEqual(["Ana Pérez", "Juan", "Sofi", "Tomás"]);
  });

  it("caps each name and the number of lines", () => {
    const names = parseGuestNames(Array.from({ length: 600 }, (_, i) => `G${i}`).join("\n") + "\n" + "x".repeat(300));
    expect(names).toHaveLength(500);
    expect(parseGuestNames("y".repeat(300))[0]).toHaveLength(120);
  });
});
