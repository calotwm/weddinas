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
