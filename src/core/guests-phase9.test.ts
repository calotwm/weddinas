import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { guestInput } from "@/components/planner/section-forms";
import type { Guest } from "./couple";
import { guestSummary, restrictionSummary, splitLists, tableSheet } from "./guests";
import { PortalService } from "./portal-service";

vi.mock("server-only", () => ({}));
vi.mock("@/server/container", () => ({ portal: {}, files: {} }));

const guest = (over: Partial<Guest>): Guest => ({ id: over.name ?? "x", name: "", group: "", status: "pending", table: "", restriction: "", ...over });

describe("S3 lista A / lista B", () => {
  it("splits the list: list B guests go apart, everyone else is list A; the summary counts list A and tells list B apart", () => {
    const list = [guest({ name: "Ana", status: "confirmed" }), guest({ name: "Beto", list: "B" }), guest({ name: "Caro" })];
    const { a, b } = splitLists(list);
    expect(a.map((g) => g.name)).toEqual(["Ana", "Caro"]);
    expect(b.map((g) => g.name)).toEqual(["Beto"]);
    expect(guestSummary(list)).toMatchObject({ total: 2, confirmed: 1, listB: 1 });
  });

  it("reads the row's Lista select and keeps it on the guest", async () => {
    const form = new FormData();
    form.set("name", "Beto");
    form.set("list", "B");
    expect(guestInput(form).list).toBe("B");
    form.set("list", "A");
    expect(guestInput(form).list).toBeUndefined();

    const dir = mkdtempSync(path.join(tmpdir(), "weddinas-guests9-"));
    try {
      const service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
      const { couple } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" });
      await service.addGuests(couple.id, [{ name: "Beto", list: "B" }, { name: "Caro" }]);
      const [beto, caro] = (await service.getCouple(couple.id))!.guests;
      expect(beto.list).toBe("B");
      expect(caro).not.toHaveProperty("list");
      await service.updateGuest(couple.id, beto.id, { ...beto, list: undefined });
      expect((await service.getCouple(couple.id))!.guests[0]).not.toHaveProperty("list");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("S5 restrictions summary", () => {
  it("lists each restriction with who has it, leaving out declined guests and 'sin restricciones'", () => {
    const list = [
      guest({ name: "Ana", lastName: "Pérez", restriction: "Celíaco" }),
      guest({ name: "Beto", restriction: "celiaco" }),
      guest({ name: "Caro", restriction: "Vegano", status: "declined" }),
      guest({ name: "Dani", restriction: "Sin restricciones" }),
      guest({ name: "Eli", restriction: "Vegetariano", table: "2" }),
    ];
    expect(restrictionSummary(list)).toEqual([
      { name: "Celíaco", guests: ["Beto", "Pérez, Ana"] },
      { name: "Vegetariano", guests: ["Eli"] },
    ]);
  });
});

describe("S4 tables sheet", () => {
  it("lists the tables from the main one on (Principal, then by number), guests sorted, declined left out, unseated last", () => {
    const list = [
      guest({ name: "Ana", table: "10" }),
      guest({ name: "Beto", table: "2" }),
      guest({ name: "Caro", table: "principal" }),
      guest({ name: "Dani", table: "2", status: "declined" }),
      guest({ name: "Eli", lastName: "Alba", table: "2", restriction: "Celíaco" }),
      guest({ name: "Fede" }),
    ];
    expect(tableSheet(list)).toEqual([
      { table: "principal", guests: [{ id: "Caro", name: "Caro", restriction: "" }] },
      { table: "2", guests: [{ id: "Eli", name: "Alba, Eli", restriction: "Celíaco" }, { id: "Beto", name: "Beto", restriction: "" }] },
      { table: "10", guests: [{ id: "Ana", name: "Ana", restriction: "" }] },
      { table: "", guests: [{ id: "Fede", name: "Fede", restriction: "" }] },
    ]);
  });
});
