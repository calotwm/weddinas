import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BRIEF_CATALOG, categoryName, coupleEventBlocks, TEAM_OWNERS, VENDOR_COMMON_FIELDS } from "./brief-catalog";
import type { BriefBlock, Couple } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("brief, client feedback phase 8", () => {
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

  const load = async () => (await service.getCouple(coupleId))!;
  const block = async (key: string) => (await load()).brief.find((b) => b.key === key)!;
  const labels = (b: BriefBlock) => b.fields.map((f) => f.label);
  const save = (b: BriefBlock, over: Partial<Parameters<PortalService["updateBriefBlock"]>[2]> = {}) =>
    service.updateBriefBlock(coupleId, b.key, { vendor: b.vendor, contact: b.contact, status: b.status, owner: b.owner, fields: b.fields, ...over });
  /** Stores the couple as an older version of the app left it, bypassing load normalization. */
  const storeRaw = async (edit: (c: Couple) => void) => {
    const raw = (await repo.findById(coupleId))!;
    edit(raw);
    await repo.save(raw);
  };

  it("S23: offers Ceremonia as its own core vendor rubro, accepted by the budget", async () => {
    const entry = BRIEF_CATALOG.find((b) => b.key === "ceremonia-proveedor");
    expect(entry).toMatchObject({ name: "Ceremonia", kind: "vendor", core: true });
    expect(BRIEF_CATALOG.findIndex((b) => b.key === "ceremonia-proveedor")).toBe(BRIEF_CATALOG.findIndex((b) => b.key === "espacio") + 1);
    expect((await block("ceremonia-proveedor")).kind).toBe("vendor");
    await expect(
      service.addBudgetItem(coupleId, { category: "ceremonia-proveedor", vendor: "Oficiante X", concept: "", amount: 100, currency: "USD", adjustment: "frozen", baseMonth: "2026-11", note: "" }),
    ).resolves.toBeDefined();
  });

  it("S24: renames Combis to Autos y Combis, also on couples that stored the old name", async () => {
    expect(BRIEF_CATALOG.find((b) => b.key === "combis")?.name).toBe("Autos y Combis");
    await service.addBriefBlock(coupleId, "combis");
    await storeRaw((c) => {
      c.brief!.find((b) => b.key === "combis")!.name = "Combis";
    });
    expect((await block("combis")).name).toBe("Autos y Combis");
  });

  it("S25: keeps a title the team edited, and categoryName prefers it over the catalog name", async () => {
    const show = (await service.addBriefBlock(coupleId, "show-ceremonia"), await block("show-ceremonia"));
    await save(show, { name: "  Show ceremonia y recepción " });
    expect((await block("show-ceremonia")).name).toBe("Show ceremonia y recepción");
    expect(categoryName("show-ceremonia", (await load()).brief)).toBe("Show ceremonia y recepción");
    expect(categoryName("show-ceremonia")).toBe("Show ceremonia");

    await save(await block("show-ceremonia"), { name: "   " });
    expect((await block("show-ceremonia")).name).toBe("Show ceremonia");
    await expect(save(await block("show-ceremonia"), { name: "x".repeat(61) })).rejects.toThrow();
    // Saving without a name leaves the title as it is.
    await save(await block("show-ceremonia"), { name: "Show" });
    await save(await block("show-ceremonia"));
    expect((await block("show-ceremonia")).name).toBe("Show");
  });

  it("S27: drops the Contrato row from every vendor, keeping what it said in Detalle del servicio", async () => {
    expect(VENDOR_COMMON_FIELDS).not.toContain("Contrato");
    const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
    await storeRaw((c) => {
      for (const b of c.brief!) {
        if (b.kind !== "vendor") continue;
        b.fields.push({ label: "Contrato", detail: b.key === "espacio" ? "Firmado el 3/5" : "", note: "" });
      }
      const foto = c.brief!.find((b) => b.key === "espacio")!;
      foto.fields.find((f) => f.label === "Detalle del servicio")!.detail = "Cobertura completa";
    });
    for (const b of (await load()).brief) expect(labels(b)).not.toContain("Contrato");
    expect((await block("espacio")).fields.find((f) => f.label === "Detalle del servicio")?.detail).toBe("Cobertura completa\nContrato: Firmado el 3/5");
    expect(labels(await block(key))).not.toContain("Contrato");
    // The catalog does not bring it back on later loads either.
    await save(await block("espacio"));
    expect(labels(await block("espacio"))).not.toContain("Contrato");
  });

  it("S26: drops the Proveedor row from every rubro, keeping its name in the header and its text in the first row", async () => {
    const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
    await storeRaw((c) => {
      for (const b of c.brief!) b.fields.push({ label: "Proveedor", detail: "", note: "" });
      const espacio = c.brief!.find((b) => b.key === "espacio")!;
      espacio.vendor = "Darwin";
      espacio.fields.find((f) => f.label === "Proveedor")!.detail = "darwin";
      espacio.fields.find((f) => f.label === "Proveedor")!.note = "Confirmación a proveedor";
      const custom = c.brief!.find((b) => b.key === key)!;
      custom.vendor = "";
      custom.fields.find((f) => f.label === "Proveedor")!.detail = "Pirotecnia Sur";
      const foto = c.brief!.find((b) => b.key === "foto")!;
      foto.vendor = "Lente";
      foto.fields.find((f) => f.label === "Proveedor")!.detail = "Lente + Cine";
    });
    for (const b of (await load()).brief) expect(labels(b)).not.toContain("Proveedor");
    const espacio = await block("espacio");
    expect(espacio.vendor).toBe("Darwin");
    expect(espacio.fields[0].note).toMatch(/Proveedor: Confirmación a proveedor$/);
    expect((await block(key)).vendor).toBe("Pirotecnia Sur");
    const foto = await block("foto");
    expect(foto.vendor).toBe("Lente");
    expect(foto.fields[0].detail).toMatch(/Proveedor: Lente \+ Cine$/);
    await save(await block("espacio"));
    expect(labels(await block("espacio"))).not.toContain("Proveedor");
  });

  it("S28: drops En búsqueda; stored and new vendor blocks read as Para decidir", async () => {
    await storeRaw((c) => {
      c.brief!.find((b) => b.key === "foto")!.status = "searching";
    });
    expect((await block("foto")).status).toBe("deciding");
    expect((await block("dj")).status).toBe("deciding");
    const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
    expect((await block(key)).status).toBe("deciding");
    // An old import still sending "searching" is saved as "deciding".
    await save(await block("foto"), { status: "searching" });
    expect((await block("foto")).status).toBe("deciding");
  });

  it("S29: drops Confirmaciones from Invitaciones, keeping what it said in Invitación digital", async () => {
    expect(BRIEF_CATALOG.find((b) => b.key === "invitaciones")?.fields).toEqual(["Save the Date", "Invitación digital"]);
    await storeRaw((c) => {
      const inv = c.brief!.find((b) => b.key === "invitaciones")!;
      inv.fields.push({ label: "Confirmaciones", detail: "Por la web", note: "" });
    });
    const inv = await block("invitaciones");
    expect(labels(inv)).toEqual(["Save the Date", "Invitación digital"]);
    expect(inv.fields.find((f) => f.label === "Invitación digital")?.detail).toBe("Confirmaciones: Por la web");
  });

  it("S30: keeps line breaks in a row's Aclaraciones", async () => {
    const dj = await block("dj");
    await save(dj, { fields: dj.fields.map((f) => (f.label === "DJ" ? { ...f, note: "Primera línea\nSegunda línea" } : f)) });
    expect((await block("dj")).fields.find((f) => f.label === "DJ")?.note).toBe("Primera línea\nSegunda línea");
  });

  it("S32: lets the couple be in charge of a rubro", async () => {
    expect(TEAM_OWNERS).toContain("Novios");
    await save(await block("dj"), { owner: "Novios" });
    expect((await block("dj")).owner).toBe("Novios");
  });

  it("S34/S35: shows the couple every event block with content, whatever its status, and only two Invitaciones rows", async () => {
    await storeRaw((c) => {
      const civil = c.brief!.find((b) => b.key === "civil")!;
      civil.status = "deciding";
      civil.fields.find((f) => f.label === "Fecha")!.detail = "5/2";
      const inv = c.brief!.find((b) => b.key === "invitaciones")!;
      inv.fields.find((f) => f.label === "Save the Date")!.detail = "https://canva.com/std";
      inv.fields.push({ label: "Diseño", detail: "Interno", note: "" });
      const ceremonia = c.brief!.find((b) => b.key === "ceremonia")!;
      ceremonia.status = "na";
      ceremonia.fields[0].detail = "Nadie";
    });
    const shown = coupleEventBlocks((await load()).brief);
    expect(shown.map((b) => b.key)).toEqual(["invitaciones", "civil"]);
    expect(labels(shown[0])).toEqual(["Save the Date", "Invitación digital"]);
  });
});
