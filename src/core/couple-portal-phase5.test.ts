import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("couple portal, second review round", () => {
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
  const proposal = async (id: string) => (await load()).proposals.find((p) => p.id === id)!;

  describe("S2 finalists", () => {
    it("marks and unmarks a presented proposal as finalist without changing its status", async () => {
      const p = await service.addProposal(coupleId, { title: "Foto A", description: "" });
      expect((await proposal(p.id)).finalist).toBeUndefined();
      await service.setProposalFinalist(coupleId, p.id, true);
      expect(await proposal(p.id)).toMatchObject({ finalist: true, status: "pending" });
      await service.setProposalFinalist(coupleId, p.id, false);
      expect(await proposal(p.id)).toMatchObject({ finalist: false, status: "pending" });
    });

    it("refuses drafts, discarded and unknown proposals", async () => {
      const draft = await service.addProposal(coupleId, { title: "Borrador", description: "" }, { present: false });
      await expect(service.setProposalFinalist(coupleId, draft.id, true)).rejects.toThrow();
      const a = await service.addProposal(coupleId, { title: "Foto A", description: "", category: "foto" });
      const b = await service.addProposal(coupleId, { title: "Foto B", description: "", category: "foto" });
      await service.respondToProposal(coupleId, a.id, "approved", "");
      expect((await proposal(b.id)).status).toBe("discarded");
      await expect(service.setProposalFinalist(coupleId, b.id, true)).rejects.toThrow();
      await expect(service.setProposalFinalist(coupleId, "nope", true)).rejects.toThrow();
      expect((await proposal(b.id)).finalist).toBeUndefined();
    });

    it("keeps the approve effect: choosing one confirms the rubro and discards its siblings", async () => {
      const a = await service.addProposal(coupleId, { title: "Foto A", description: "", category: "foto" });
      const b = await service.addProposal(coupleId, { title: "Foto B", description: "", category: "foto" });
      await service.setProposalFinalist(coupleId, a.id, true);
      await service.respondToProposal(coupleId, a.id, "approved", "");
      expect(await proposal(a.id)).toMatchObject({ status: "approved", finalist: true });
      expect((await proposal(b.id)).status).toBe("discarded");
      expect((await load()).brief.find((x) => x.key === "foto")?.status).toBe("confirmed");
    });
  });

  describe("S13 family notes", () => {
    it("stores the optional Aclaraciones of a family member and edits them", async () => {
      const with_ = await service.addFamilyMember(coupleId, { side: "a", name: "Mercedes", relation: "Madre", notes: "  Vestido azul  " });
      const without = await service.addFamilyMember(coupleId, { side: "b", name: "Juan", relation: "Tío" });
      let family = (await load()).family;
      expect(family.find((m) => m.id === with_.id)?.notes).toBe("Vestido azul");
      expect(family.find((m) => m.id === without.id)?.notes).toBe("");

      await service.updateFamilyMember(coupleId, without.id, { name: " Juan Carlos ", relation: "Tío", notes: "Barba" });
      family = (await load()).family;
      expect(family.find((m) => m.id === without.id)).toMatchObject({ name: "Juan Carlos", relation: "Tío", notes: "Barba", side: "b" });
      await expect(service.updateFamilyMember(coupleId, without.id, { name: " ", relation: "", notes: "" })).rejects.toThrow();
      await expect(service.updateFamilyMember(coupleId, "nope", { name: "X", relation: "", notes: "" })).rejects.toThrow();
    });

    it("loads members stored before Aclaraciones existed with empty notes", async () => {
      const member = await service.addFamilyMember(coupleId, { side: "a", name: "Abuela", relation: "Abuela" });
      const file = path.join(dir, "db.json");
      const stored = JSON.parse(readFileSync(file, "utf8"));
      for (const m of stored[0].family) delete m.notes;
      const { writeFileSync } = await import("node:fs");
      writeFileSync(file, JSON.stringify(stored));
      const reloaded = new PortalService(new JsonCoupleRepository(file));
      expect((await reloaded.getCouple(coupleId))!.family.find((m) => m.id === member.id)?.notes).toBe("");
    });
  });

  describe("S12 / S16 the couple only reads tasks and timing", () => {
    const coupleActions = readFileSync(path.join(process.cwd(), "src/app/portal/actions.ts"), "utf8");
    const exported = [...coupleActions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);

    // Phase 6 S7: the couple no longer ticks tasks either; only the team does.
    it("exposes no action to add, delete or tick tasks", () => {
      expect(exported).not.toContain("toggleTask");
      expect(exported).not.toContain("addTask");
      expect(exported).not.toContain("deleteTask");
      expect(coupleActions).not.toMatch(/portal\.(addTask|deleteTask|setTaskMonth)\(/);
    });

    it("exposes no action that writes the timing", () => {
      expect(exported.filter((name) => /timing/i.test(name))).toEqual([]);
      expect(coupleActions).not.toMatch(/portal\.(add|update|delete)(Vendor)?TimingItem\(/);
    });
  });
});
