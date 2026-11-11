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

  const attachmentsOf = async (proposalId: string) => (await service.getCouple(coupleId))!.proposals.find((p) => p.id === proposalId)!.attachments ?? [];
  const fileA = { id: "0f8fad5b-d9cb-469f-a165-70867728950e.xlsx", name: "Dj <Uno>.xlsx", size: 2048 };
  const fileB = { id: "7c9e6679-7425-40de-944b-e07fc1f90ae7.xlsx", name: "Dj Dos.xlsx", size: 4096 };

  it("keeps the original file as a team-only attachment, replaced with the table and removed with it", async () => {
    const proposal = await service.addProposal(coupleId, { title: "Dj", description: "" });
    const pdf = await service.addAttachment(coupleId, { kind: "proposal", id: proposal.id }, { id: "1b4e28ba-2fa1-41d2-883f-0016d3cca427.pdf", name: "presupuesto.pdf", size: 1, internal: false });

    expect(await service.setProposalComparison(coupleId, proposal.id, table("Dj Uno"), fileA)).toBeNull();
    expect(await comparisonOf(proposal.id)).toEqual({ ...table("Dj Uno"), attachmentId: fileA.id });
    expect(await attachmentsOf(proposal.id)).toEqual([pdf, { id: fileA.id, name: "Dj Uno.xlsx", size: 2048, uploadedAt: expect.any(String), internal: true }]);

    expect(await service.setProposalComparison(coupleId, proposal.id, table("Dj Dos"), fileB)).toBe(fileA.id);
    expect((await attachmentsOf(proposal.id)).map((a) => [a.id, a.internal])).toEqual([[pdf.id, false], [fileB.id, true]]);

    expect(await service.setProposalComparison(coupleId, proposal.id, null)).toBe(fileB.id);
    expect(await attachmentsOf(proposal.id)).toEqual([pdf]);
  });

  it("forgets the link when the team deletes the file by hand, and never removes other attachments", async () => {
    const proposal = await service.addProposal(coupleId, { title: "Dj", description: "" });
    await service.setProposalComparison(coupleId, proposal.id, table("Dj Uno"), fileA);
    expect(await service.removeAttachment(coupleId, { kind: "proposal", id: proposal.id }, fileA.id)).toBe(fileA.id);
    expect(await comparisonOf(proposal.id)).toEqual(table("Dj Uno"));
    expect(await service.setProposalComparison(coupleId, proposal.id, null)).toBeNull();
  });

  it("keeps proposal attachments uploaded by the team visible to the couple", async () => {
    const proposal = await service.addProposal(coupleId, { title: "Dj", description: "" });
    const added = await service.addAttachment(coupleId, { kind: "proposal", id: proposal.id }, { id: "1b4e28ba-2fa1-41d2-883f-0016d3cca427.pdf", name: "a.pdf", size: 1, internal: true });
    expect(added.internal).toBe(false);
  });

  it("rejects an unknown proposal and leaves the others untouched", async () => {
    const other = await service.addProposal(coupleId, { title: "Foto", description: "" });
    await expect(service.setProposalComparison(coupleId, "nope", table("Dj Uno"))).rejects.toThrow("Proposal not found");
    expect(await comparisonOf(other.id)).toBeUndefined();
  });
});
