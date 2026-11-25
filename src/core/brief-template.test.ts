import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { catalogBlock, TEAM_FIELD } from "./brief-catalog";
import type { BriefBlock, Couple } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("S21: every brief follows the Agus y Ventu template", () => {
  let dir: string;
  let repo: JsonCoupleRepository;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    repo = new JsonCoupleRepository(path.join(dir, "db.json"));
    service = new PortalService(repo);
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const block = async (key: string) => (await service.getCouple(coupleId))!.brief.find((b) => b.key === key)!;
  const labels = (b: BriefBlock) => b.fields.map((f) => f.label);
  const storeRaw = async (edit: (c: Couple) => void) => {
    const raw = (await repo.findById(coupleId))!;
    edit(raw);
    await repo.save(raw);
  };

  it("uses the template's rows, in its order, for the catalog rubros", () => {
    expect(catalogBlock("dj")!.fields).toEqual([
      "Pago", "Cantidad de horas", "Fletes", "Depósito de garantía", "DJ", "Reunión musical", "Ceremonia", "Recepción", "Salón principal",
      "Pista de baile", "Sector dj", "Efectos", "Requerimientos proveedores", "Visuales", "Grupo electrógeno", "Aclaraciones",
    ]);
    expect(catalogBlock("ceremonia")!.fields).not.toContain("Oficia");
    expect(catalogBlock("ceremonia")!.fields.at(-1)).toBe("Tirada");
  });

  it("a new couple's brief has exactly the template rows plus Equipo", async () => {
    expect(labels(await block("dj"))).toEqual([...catalogBlock("dj")!.fields, TEAM_FIELD]);
  });

  it("reshapes an older brief once: template order, written extra rows kept, empty extra rows dropped", async () => {
    await storeRaw((c) => {
      const dj = c.brief.find((b) => b.key === "dj")!;
      dj.templateVersion = undefined;
      dj.removedFields = ["Visuales"];
      dj.fields = [
        { label: "Visuales", detail: "LED", note: "" },
        { label: "Requerimiento show", detail: "", note: "" },
        { label: "Servicio", detail: "5 horas", note: "" },
        { label: "Pago", detail: "", note: "seña" },
        { label: TEAM_FIELD, detail: "10%", note: "" },
      ];
    });
    const dj = await block("dj");
    const template = catalogBlock("dj")!.fields;
    expect(labels(dj)).toEqual([...template, "Servicio", TEAM_FIELD]);
    expect(dj.fields.find((f) => f.label === "Visuales")!.detail).toBe("LED");
    expect(dj.fields.find((f) => f.label === "Pago")!.note).toBe("seña");
    expect(dj.fields.find((f) => f.label === TEAM_FIELD)!.detail).toBe("10%");
    expect(dj.removedFields ?? []).toEqual([]);
  });

  it("after the reshape, the team's own order and removals stay", async () => {
    const dj = await block("dj");
    const reversed = [...dj.fields].reverse().filter((f) => f.label !== "Visuales");
    await service.updateBriefBlock(coupleId, "dj", { vendor: "", contact: "", status: dj.status, owner: "", fields: reversed });
    expect(labels(await block("dj"))).toEqual(reversed.map((f) => f.label));
  });
});
