import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { categoryName, CUSTOM_BLOCK_NAME_MAX, VENDOR_COMMON_FIELDS } from "./brief-catalog";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("team admin: custom rubros and proposal edits", () => {
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

  describe("S25 custom rubro", () => {
    it("adds a vendor block by name with a stable key, its name and the common vendor fields, after the catalog blocks", async () => {
      const key = await service.addCustomBriefBlock(coupleId, "  Fuegos artificiales ");
      expect(key).toBe("custom-fuegos-artificiales");
      const brief = (await load()).brief;
      const block = brief.find((b) => b.key === key)!;
      expect(block).toMatchObject({ name: "Fuegos artificiales", kind: "vendor", vendor: "", status: "searching" });
      expect(block.fields.map((f) => f.label)).toEqual(VENDOR_COMMON_FIELDS);
      expect(brief.at(-1)!.key).toBe(key);

      await service.addBriefBlock(coupleId, "cotillon");
      expect((await load()).brief.at(-1)!.key).toBe(key);
    });

    it("rejects empty, too long and duplicate names, including catalog rubros", async () => {
      await expect(service.addCustomBriefBlock(coupleId, "   ")).rejects.toThrow();
      await expect(service.addCustomBriefBlock(coupleId, "!!!")).rejects.toThrow();
      await expect(service.addCustomBriefBlock(coupleId, "x".repeat(CUSTOM_BLOCK_NAME_MAX + 1))).rejects.toThrow();
      await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
      await expect(service.addCustomBriefBlock(coupleId, "fuegos ARTIFICIALES")).rejects.toThrow();
      await expect(service.addCustomBriefBlock(coupleId, "Cotillón")).rejects.toThrow();
      expect((await load()).brief.filter((b) => b.key === "custom-fuegos-artificiales")).toHaveLength(1);
    });

    it("keeps the custom block's details on save and its key short enough for the forms", async () => {
      const key = await service.addCustomBriefBlock(coupleId, "y".repeat(CUSTOM_BLOCK_NAME_MAX));
      expect(key.length).toBeLessThanOrEqual(60);
      await service.updateBriefBlock(coupleId, key, { vendor: "Pirotecnia Sur", contact: "", status: "confirmed", owner: "", fields: [{ label: "Pago", detail: "50%", note: "" }] });
      const block = (await load()).brief.find((b) => b.key === key)!;
      expect(block.vendor).toBe("Pirotecnia Sur");
      expect(block.fields).toEqual([{ label: "Pago", detail: "50%", note: "" }]);
    });

    it("resolves a custom rubro's name from the stored block", async () => {
      const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
      const brief = (await load()).brief;
      expect(categoryName(key, brief)).toBe("Fuegos artificiales");
      expect(categoryName("foto", brief)).toBe("Foto");
      expect(categoryName("custom-fuegos-artificiales")).toBe("Fuegos artificiales");
    });

    it("lets a proposal use the couple's custom rubro and confirms its block when approved", async () => {
      const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
      const p = await service.addProposal(coupleId, { title: "Pirotecnia Sur", description: "", category: key });
      expect((await load()).proposals[0].category).toBe(key);
      await service.respondToProposal(coupleId, p.id, "approved", "");
      expect((await load()).brief.find((b) => b.key === key)).toMatchObject({ vendor: "Pirotecnia Sur", status: "confirmed" });
      await expect(service.addProposal(coupleId, { title: "X", description: "", category: "custom-otra-cosa" })).rejects.toThrow();
    });

    it("brings a removed custom rubro back when the couple approves a proposal of it", async () => {
      const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
      const p = await service.addProposal(coupleId, { title: "Pirotecnia Sur", description: "", category: key });
      await service.removeBriefBlock(coupleId, key);
      await service.respondToProposal(coupleId, p.id, "approved", "");
      expect((await load()).brief.find((b) => b.key === key)).toMatchObject({ name: "Fuegos artificiales", kind: "vendor", status: "confirmed" });
    });
  });

  describe("S24 edit proposals", () => {
    it("updates title, rubro, budget, description and link on any status", async () => {
      const p = await service.addProposal(coupleId, { title: "Foto A", description: "Cobertura", amount: "USD 1000", category: "foto" });
      await service.respondToProposal(coupleId, p.id, "rejected", "");
      await service.updateProposal(coupleId, p.id, { title: " Video A ", description: "Racconto", amount: "USD 1500", link: "https://a.com", category: "video" });
      const edited = (await load()).proposals.find((x) => x.id === p.id)!;
      expect(edited).toMatchObject({ title: "Video A", description: "Racconto", amount: "USD 1500", link: "https://a.com", category: "video", status: "rejected" });

      await service.updateProposal(coupleId, p.id, { title: "Video A", description: "", amount: "", link: "", category: "" });
      expect((await load()).proposals.find((x) => x.id === p.id)!.category).toBeUndefined();
    });

    it("validates like adding one", async () => {
      const p = await service.addProposal(coupleId, { title: "Foto A", description: "" });
      const base = { title: "Foto A", description: "", amount: "", link: "", category: "" };
      await expect(service.updateProposal(coupleId, p.id, { ...base, category: "nope" })).rejects.toThrow();
      await expect(service.updateProposal(coupleId, p.id, { ...base, category: "civil" })).rejects.toThrow();
      await expect(service.updateProposal(coupleId, p.id, { ...base, title: "  " })).rejects.toThrow();
      await expect(service.updateProposal(coupleId, "missing", base)).rejects.toThrow();
      expect((await load()).proposals[0].title).toBe("Foto A");
    });

    it("keeps a rubro whose custom block was removed when the edit leaves it unchanged", async () => {
      const key = await service.addCustomBriefBlock(coupleId, "Fuegos artificiales");
      const p = await service.addProposal(coupleId, { title: "Pirotecnia", description: "", category: key });
      await service.removeBriefBlock(coupleId, key);
      await service.updateProposal(coupleId, p.id, { title: "Pirotecnia Sur", description: "", amount: "", link: "", category: key });
      expect((await load()).proposals[0]).toMatchObject({ title: "Pirotecnia Sur", category: key });
    });
  });
});
