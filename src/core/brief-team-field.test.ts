import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { coupleFields, TEAM_FIELD } from "./brief-catalog";
import { commissionGroups } from "./commissions";
import type { BriefBlock } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("brief team field and row order", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const load = async () => (await service.getCouple(coupleId))!;
  const block = async (key: string) => (await load()).brief.find((b) => b.key === key)!;
  const save = (b: BriefBlock, fields: BriefBlock["fields"]) =>
    service.updateBriefBlock(coupleId, b.key, { vendor: b.vendor, contact: b.contact, status: b.status, owner: b.owner, fields });

  it("gives every vendor rubro an Equipo row, catalog and custom ones, but not event blocks", async () => {
    const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
    expect((await block("catering")).fields.map((f) => f.label)).toContain(TEAM_FIELD);
    expect((await block(key)).fields.map((f) => f.label)).toContain(TEAM_FIELD);
    expect((await block("ceremonia")).fields.map((f) => f.label)).not.toContain(TEAM_FIELD);
  });

  it("keeps the rows in the order the team left them after loading again", async () => {
    const dj = await block("dj");
    const reversed = [...dj.fields].reverse();
    await save(dj, reversed);
    expect((await block("dj")).fields.map((f) => f.label)).toEqual(reversed.map((f) => f.label));
  });

  it("keeps a removed catalog row removed after loading again, and brings it back when added by name", async () => {
    const dj = await block("dj");
    await save(dj, dj.fields.filter((f) => f.label !== "Visuales" && f.label !== TEAM_FIELD));
    const labels = (await block("dj")).fields.map((f) => f.label);
    expect(labels).not.toContain("Visuales");
    expect(labels).not.toContain(TEAM_FIELD);

    const again = await block("dj");
    await save(again, [...again.fields, { label: "Visuales", detail: "LED", note: "" }]);
    expect((await block("dj")).fields.find((f) => f.label === "Visuales")).toMatchObject({ detail: "LED" });
  });

  it("leaves the Equipo row out of what the couple and the vendors see", () => {
    const fields = [
      { label: "Pago", detail: "Seña", note: "" },
      { label: TEAM_FIELD, detail: "10% comisión", note: "" },
    ];
    expect(coupleFields(fields).map((f) => f.label)).toEqual(["Pago"]);
  });

  it("lists, per couple, each vendor rubro whose Equipo row has something written", async () => {
    const catering = await block("catering");
    await service.updateBriefBlock(coupleId, "catering", {
      vendor: "Softies",
      contact: "",
      status: "confirmed",
      owner: "",
      fields: catering.fields.map((f) => (f.label === TEAM_FIELD ? { ...f, detail: "10% comisión" } : f)),
    });
    const groups = commissionGroups([await load()]);
    expect(groups.map((g) => [g.couple.id, g.lines])).toEqual([[coupleId, [{ blockKey: "catering", blockName: "Catering", vendor: "Softies", detail: "10% comisión" }]]]);
    expect(commissionGroups([{ ...(await load()), brief: [] }])).toEqual([]);
  });
});
