import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { blankComparison, ComparisonEditError, editableSheets, parseComparisonEdit, type ComparisonSheet } from "./comparison-table";
import { PortalService } from "./portal-service";

const sheet: ComparisonSheet = {
  name: "Foto",
  columns: ["Proveedor", "Valor", "Incluye"],
  vendors: [
    { name: "Ale", group: "Foto", rows: [["$ 100", "Álbum"], ["", "Video"]] },
    { name: "Fede", rows: [["$ 200", ""]] },
  ],
};

describe("comparison table edits (S13, S14)", () => {
  it("opens a parsed table for editing: one row per vendor, multi-row cells joined by lines", () => {
    expect(editableSheets([sheet])).toEqual([
      {
        name: "Foto",
        columns: ["Proveedor", "Valor", "Incluye"],
        vendors: [
          { name: "Ale", group: "Foto", rows: [["$ 100", "Álbum\nVideo"]] },
          { name: "Fede", rows: [["$ 200", ""]] },
        ],
      },
    ]);
  });

  it("starts a blank table with two options and a few rows to fill", () => {
    const blank = blankComparison();
    expect(blank.columns).toEqual(["Proveedor", "Valor", "Incluye", "Forma de pago"]);
    expect(blank.vendors.map((v) => v.name)).toEqual(["Opción 1", "Opción 2"]);
    expect(blank.vendors[0].rows).toEqual([["", "", ""]]);
  });

  it("accepts an edited table, trimming names and padding or cutting cells to the columns", () => {
    const json = JSON.stringify([{ name: " Foto ", columns: ["Proveedor", " Valor ", "Extra"], vendors: [{ name: " Ale ", rows: [["1", "2", "3", "4"]] }, { name: "Fede", rows: [["x"]] }] }]);
    expect(parseComparisonEdit(json)).toEqual([
      { name: "Foto", columns: ["Proveedor", "Valor", "Extra"], vendors: [{ name: "Ale", rows: [["1", "2"]] }, { name: "Fede", rows: [["x", ""]] }] },
    ]);
  });

  it("rejects tables without vendors, with unnamed or repeated vendors, or too big", () => {
    const one = (vendors: unknown[], columns = ["Proveedor", "Valor"]) => JSON.stringify([{ name: "A", columns, vendors }]);
    expect(() => parseComparisonEdit("nope")).toThrow(ComparisonEditError);
    expect(() => parseComparisonEdit(one([]))).toThrow(ComparisonEditError);
    expect(() => parseComparisonEdit(one([{ name: " ", rows: [["1"]] }]))).toThrow("nombre");
    expect(() => parseComparisonEdit(one([{ name: "A", rows: [["1"]] }, { name: "a", rows: [["2"]] }]))).toThrow("repet");
    expect(() => parseComparisonEdit(one([{ name: "A", rows: [["1"]] }], ["Proveedor", ...Array(41).fill("x")]))).toThrow(ComparisonEditError);
  });
});

describe("editing a proposal's comparison table", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-comparison-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("builds one from scratch, keeps the uploaded file's name and original when edited, and drops a choice no longer in it", async () => {
    const proposal = await service.addProposal(coupleId, { title: "Foto", description: "" });
    await service.editProposalComparison(coupleId, proposal.id, [blankComparison()]);
    let saved = (await service.getCouple(coupleId))!.proposals[0];
    expect(saved.comparison).toMatchObject({ fileName: "Cuadro armado en la web", sheets: [{ vendors: [{ name: "Opción 1" }, { name: "Opción 2" }] }] });

    await service.setProposalComparison(coupleId, proposal.id, { fileName: "foto.xlsx", uploadedAt: "2026-11-01T00:00:00Z", sheets: [sheet] }, { id: "00000000-0000-4000-8000-000000000001.xlsx", name: "foto.xlsx", size: 10 });
    await service.chooseProposalVendor(coupleId, proposal.id, "Fede");
    await service.editProposalComparison(coupleId, proposal.id, [{ ...sheet, vendors: [sheet.vendors[0], { name: "Fede Petri", rows: [["$ 200", ""]] }] }]);
    saved = (await service.getCouple(coupleId))!.proposals[0];
    expect(saved.comparison).toMatchObject({ fileName: "foto.xlsx", attachmentId: "00000000-0000-4000-8000-000000000001.xlsx" });
    expect(saved.comparison!.sheets[0].vendors.map((v) => v.name)).toEqual(["Ale", "Fede Petri"]);
    expect(saved.chosenVendor).toBeUndefined();
  });
});
