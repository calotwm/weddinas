import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import type { ComparisonTable } from "./comparison-table";
import { PortalService } from "./portal-service";

describe("proposals: choosing a vendor from the comparison table", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const table = (...vendors: string[]): ComparisonTable => ({
    fileName: "catering.xlsx",
    uploadedAt: "2026-11-13T12:00:00.000Z",
    sheets: [{ name: "Hoja 1", columns: ["Proveedor", "Total final"], vendors: vendors.map((name) => ({ name, rows: [["$ 1.000"]] })) }],
  });
  const load = async () => (await service.getCouple(coupleId))!;
  const byId = async (id: string) => (await load()).proposals.find((p) => p.id === id)!;
  const block = async (key: string) => (await load()).brief.find((b) => b.key === key);

  const cateringWithTable = async () => {
    const p = await service.addProposal(coupleId, { title: "Cuadro catering", description: "", category: "catering" });
    await service.setProposalComparison(coupleId, p.id, table("Softies", "Caruchef", "Nantes"));
    return p;
  };

  it("records the chosen vendor, approves the proposal and names that vendor in the brief", async () => {
    const p = await cateringWithTable();
    const other = await service.addProposal(coupleId, { title: "Otro catering", description: "", category: "catering" });

    await service.chooseProposalVendor(coupleId, p.id, "Caruchef");

    expect(await byId(p.id)).toMatchObject({ status: "approved", chosenVendor: "Caruchef", respondedAt: expect.any(String) });
    expect((await byId(other.id)).status).toBe("discarded");
    expect(await block("catering")).toMatchObject({ status: "confirmed", vendor: "Caruchef", confirmedAt: expect.any(String) });
  });

  it("switches to another vendor when the couple chooses again", async () => {
    const p = await cateringWithTable();
    await service.chooseProposalVendor(coupleId, p.id, "Softies");
    await service.chooseProposalVendor(coupleId, p.id, "Nantes");

    expect((await byId(p.id)).chosenVendor).toBe("Nantes");
    expect(await block("catering")).toMatchObject({ status: "confirmed", vendor: "Nantes" });
  });

  it("rejects a vendor that is not in the table", async () => {
    const p = await cateringWithTable();
    await expect(service.chooseProposalVendor(coupleId, p.id, "U Catering")).rejects.toThrow();
    expect((await byId(p.id)).status).toBe("pending");
    expect((await byId(p.id)).chosenVendor).toBeUndefined();
  });

  it("rejects a proposal without a comparison table, a draft and a discarded one", async () => {
    const plain = await service.addProposal(coupleId, { title: "Sin cuadro", description: "", category: "foto" });
    await expect(service.chooseProposalVendor(coupleId, plain.id, "Softies")).rejects.toThrow();
    expect((await byId(plain.id)).status).toBe("pending");

    const draft = await service.addProposal(coupleId, { title: "Borrador", description: "", category: "catering" }, { present: false });
    await service.setProposalComparison(coupleId, draft.id, table("Softies"));
    await expect(service.chooseProposalVendor(coupleId, draft.id, "Softies")).rejects.toThrow();

    const p = await cateringWithTable();
    const lost = await cateringWithTable();
    await service.chooseProposalVendor(coupleId, p.id, "Softies");
    await expect(service.chooseProposalVendor(coupleId, lost.id, "Softies")).rejects.toThrow();
  });

  it("works without a rubro: approves and records the vendor, touching no brief block", async () => {
    const p = await service.addProposal(coupleId, { title: "Suelta", description: "" });
    await service.setProposalComparison(coupleId, p.id, table("Softies"));
    const before = (await load()).brief;
    await service.chooseProposalVendor(coupleId, p.id, "Softies");
    expect(await byId(p.id)).toMatchObject({ status: "approved", chosenVendor: "Softies" });
    expect((await load()).brief).toEqual(before);
  });

  it("forgets the choice when the team replaces the table without that vendor or removes it", async () => {
    const p = await cateringWithTable();
    await service.chooseProposalVendor(coupleId, p.id, "Softies");
    await service.setProposalComparison(coupleId, p.id, table("Softies", "Otro"));
    expect((await byId(p.id)).chosenVendor).toBe("Softies");
    await service.setProposalComparison(coupleId, p.id, table("Otro"));
    expect((await byId(p.id)).chosenVendor).toBeUndefined();
    await service.chooseProposalVendor(coupleId, p.id, "Otro");
    await service.setProposalComparison(coupleId, p.id, null);
    expect((await byId(p.id)).chosenVendor).toBeUndefined();
  });

  it("forgets the choice when the couple then answers that it does not convince them", async () => {
    const p = await cateringWithTable();
    await service.chooseProposalVendor(coupleId, p.id, "Softies");
    await service.respondToProposal(coupleId, p.id, "rejected", "");
    expect(await byId(p.id)).toMatchObject({ status: "rejected" });
    expect((await byId(p.id)).chosenVendor).toBeUndefined();
  });

  it("still approves with the proposal title when answered without choosing a vendor", async () => {
    const p = await cateringWithTable();
    await service.respondToProposal(coupleId, p.id, "approved", "");
    expect((await byId(p.id)).chosenVendor).toBeUndefined();
    expect(await block("catering")).toMatchObject({ status: "confirmed", vendor: "Cuadro catering" });
  });
});
