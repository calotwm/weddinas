import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import type { ComparisonTable } from "./comparison-table";
import { PortalService } from "./portal-service";

describe("PortalService.setProposalComparison", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const table = (name: string): ComparisonTable => ({
    fileName: `${name}.xlsx`,
    uploadedAt: "2026-11-11T12:00:00.000Z",
    sheets: [{ name: "Hoja 1", columns: ["Dj", "Total $"], vendors: [{ name, rows: [["$ 900.000"]] }] }],
  });
  const comparisonOf = async (proposalId: string) => (await service.getCouple(coupleId))!.proposals.find((p) => p.id === proposalId)!.comparison;

  it("stores, replaces and removes the comparison table of a proposal", async () => {
    const proposal = await service.addProposal(coupleId, { title: "Dj", description: "" });
    expect(await comparisonOf(proposal.id)).toBeUndefined();

    await service.setProposalComparison(coupleId, proposal.id, table("Dj Uno"));
    expect(await comparisonOf(proposal.id)).toEqual(table("Dj Uno"));

    await service.setProposalComparison(coupleId, proposal.id, table("Dj Dos"));
    expect(await comparisonOf(proposal.id)).toEqual(table("Dj Dos"));

    await service.setProposalComparison(coupleId, proposal.id, null);
    expect(await comparisonOf(proposal.id)).toBeUndefined();
  });

  it("rejects an unknown proposal and leaves the others untouched", async () => {
    const other = await service.addProposal(coupleId, { title: "Foto", description: "" });
    await expect(service.setProposalComparison(coupleId, "nope", table("Dj Uno"))).rejects.toThrow("Proposal not found");
    expect(await comparisonOf(other.id)).toBeUndefined();
  });
});

describe("PortalService guests from the agency's sheet", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const guests = async () => (await service.getCouple(coupleId))!.guests;
  const sheetGuest = {
    name: " Ana ",
    lastName: " Pérez ",
    age: "adult" as const,
    status: "sent" as const,
    table: "3",
    restriction: "Celíaco",
    transport: "Si (ida y vuelta)",
    group: "Familia",
    side: "Anita",
    travels: true,
    phone: " 11 5555 ",
  };

  it("stores the new optional fields trimmed, and leaves them out when blank", async () => {
    await service.addGuests(coupleId, [sheetGuest, { name: "Juan", lastName: " ", side: "" }]);
    const [ana, juan] = await guests();
    expect(ana).toEqual({
      id: ana.id,
      name: "Ana",
      lastName: "Pérez",
      age: "adult",
      status: "sent",
      table: "3",
      restriction: "Celíaco",
      transport: "Si (ida y vuelta)",
      group: "Familia",
      side: "Anita",
      travels: true,
      phone: "11 5555",
    });
    expect(juan).toEqual({ id: juan.id, name: "Juan", group: "", status: "pending", table: "", restriction: "" });
  });

  it("clears optional fields on edit and keeps the id", async () => {
    const [ana] = await service.addGuests(coupleId, [sheetGuest]);
    await service.updateGuest(coupleId, ana.id, { name: "Ana", group: "Amigos", status: "confirmed", table: "", restriction: "" });
    expect(await guests()).toEqual([{ id: ana.id, name: "Ana", group: "Amigos", status: "confirmed", table: "", restriction: "" }]);
  });

  it("rejects an unknown age", async () => {
    // @ts-expect-error invalid age on purpose
    await expect(service.addGuests(coupleId, [{ name: "X", age: "old" }])).rejects.toThrow("age");
    expect(await guests()).toEqual([]);
  });

  it("adds imported guests after the current ones, or replaces the whole list", async () => {
    await service.addGuests(coupleId, [{ name: "Vieja" }]);
    await service.addGuests(coupleId, [{ name: "Ana" }, { name: " " }]);
    expect((await guests()).map((g) => g.name)).toEqual(["Vieja", "Ana"]);

    const replaced = await service.replaceGuests(coupleId, [{ name: "Juan", status: "confirmed" }, { name: "  " }, { name: "Sofi" }]);
    expect(replaced.map((g) => g.name)).toEqual(["Juan", "Sofi"]);
    expect((await guests()).map((g) => [g.name, g.status])).toEqual([
      ["Juan", "confirmed"],
      ["Sofi", "pending"],
    ]);
  });

  it("replaces up to 1000 guests and keeps the list when the import is invalid", async () => {
    await service.addGuests(coupleId, [{ name: "Vieja" }]);
    const many = Array.from({ length: 1001 }, (_, i) => ({ name: `G${i}` }));
    await expect(service.replaceGuests(coupleId, many)).rejects.toThrow("1000");
    // @ts-expect-error invalid status on purpose
    await expect(service.replaceGuests(coupleId, [{ name: "X", status: "maybe" }])).rejects.toThrow("status");
    expect((await guests()).map((g) => g.name)).toEqual(["Vieja"]);
    await service.replaceGuests(coupleId, many.slice(0, 1000));
    expect(await guests()).toHaveLength(1000);
  });
});
