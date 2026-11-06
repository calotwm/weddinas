import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BriefBlockUpdate } from "./portal-service";
import { PortalService } from "./portal-service";
import { coupleNotifications, unreadCount } from "./notifications";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("proposals: rubro, comments, views and vendor notifications", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const load = async () => (await service.getCouple(coupleId))!;
  const byId = async (id: string) => (await load()).proposals.find((p) => p.id === id)!;
  const block = async (key: string) => (await load()).brief.find((b) => b.key === key);
  const update = (over: Partial<BriefBlockUpdate>): BriefBlockUpdate => ({ vendor: "", contact: "", status: "searching", owner: "", fields: [], ...over });

  describe("S8 rubro", () => {
    it("stores an optional vendor rubro and rejects unknown or event keys", async () => {
      const withRubro = await service.addProposal(coupleId, { title: "Foto A", description: "", category: "foto" });
      const without = await service.addProposal(coupleId, { title: "Varios", description: "", category: "" });
      expect((await byId(withRubro.id)).category).toBe("foto");
      expect((await byId(without.id)).category).toBeUndefined();
      await expect(service.addProposal(coupleId, { title: "X", description: "", category: "nope" })).rejects.toThrow();
      await expect(service.addProposal(coupleId, { title: "X", description: "", category: "civil" })).rejects.toThrow();
    });

    it("approving a proposal with rubro discards the other pending presented ones of that rubro", async () => {
      const a = await service.addProposal(coupleId, { title: "Foto A", description: "", category: "foto" });
      const b = await service.addProposal(coupleId, { title: "Foto B", description: "", category: "foto" });
      const draft = await service.addProposal(coupleId, { title: "Foto borrador", description: "", category: "foto" }, { present: false });
      const rejected = await service.addProposal(coupleId, { title: "Foto C", description: "", category: "foto" });
      const other = await service.addProposal(coupleId, { title: "Video A", description: "", category: "video" });
      const loose = await service.addProposal(coupleId, { title: "Sin rubro", description: "" });
      await service.respondToProposal(coupleId, rejected.id, "rejected", "");

      await service.respondToProposal(coupleId, a.id, "approved", "");

      expect((await byId(a.id)).status).toBe("approved");
      expect((await byId(b.id)).status).toBe("discarded");
      expect((await byId(draft.id)).status).toBe("pending");
      expect((await byId(rejected.id)).status).toBe("rejected");
      expect((await byId(other.id)).status).toBe("pending");
      expect((await byId(loose.id)).status).toBe("pending");
    });

    it("approving without a rubro discards nothing", async () => {
      const a = await service.addProposal(coupleId, { title: "A", description: "" });
      const b = await service.addProposal(coupleId, { title: "B", description: "" });
      await service.respondToProposal(coupleId, a.id, "approved", "");
      expect((await byId(b.id)).status).toBe("pending");
    });

    it("confirms the rubro's brief block with the proposal as vendor, adding the block when missing", async () => {
      expect(await block("torta")).toBeUndefined();
      const p = await service.addProposal(coupleId, { title: "Tortas Lola", description: "", category: "torta" });
      await service.respondToProposal(coupleId, p.id, "approved", "");
      expect(await block("torta")).toMatchObject({ status: "confirmed", vendor: "Tortas Lola", confirmedAt: expect.any(String) });
    });

    it("keeps a vendor the team already wrote in the brief", async () => {
      await service.updateBriefBlock(coupleId, "foto", update({ vendor: "Estudio Luz" }));
      const p = await service.addProposal(coupleId, { title: "Foto propuesta", description: "", category: "foto" });
      await service.respondToProposal(coupleId, p.id, "approved", "");
      expect(await block("foto")).toMatchObject({ status: "confirmed", vendor: "Estudio Luz" });
    });

    it("does not confirm the brief when the proposal is rejected", async () => {
      const p = await service.addProposal(coupleId, { title: "Foto", description: "", category: "foto" });
      await service.respondToProposal(coupleId, p.id, "rejected", "");
      expect((await block("foto"))?.status).toBe("searching");
    });

    it("the couple cannot answer a discarded proposal", async () => {
      const a = await service.addProposal(coupleId, { title: "A", description: "", category: "foto" });
      const b = await service.addProposal(coupleId, { title: "B", description: "", category: "foto" });
      await service.respondToProposal(coupleId, a.id, "approved", "");
      await expect(service.respondToProposal(coupleId, b.id, "approved", "")).rejects.toThrow();
    });
  });

  describe("S9 comments", () => {
    it("keeps a thread of couple and team comments on a presented proposal", async () => {
      const p = await service.addProposal(coupleId, { title: "Barra", description: "" });
      await service.addProposalComment(coupleId, p.id, "couple", "  ¿Incluye tragos de autor?  ");
      await service.addProposalComment(coupleId, p.id, "team", "Sí, tres.");
      const comments = (await byId(p.id)).comments ?? [];
      expect(comments.map((c) => [c.author, c.text])).toEqual([
        ["couple", "¿Incluye tragos de autor?"],
        ["team", "Sí, tres."],
      ]);
      expect(comments[0]).toMatchObject({ id: expect.any(String), at: expect.any(String) });
    });

    it("rejects empty comments, drafts and unknown authors", async () => {
      const p = await service.addProposal(coupleId, { title: "Barra", description: "" });
      const draft = await service.addProposal(coupleId, { title: "Draft", description: "" }, { present: false });
      await expect(service.addProposalComment(coupleId, p.id, "couple", "   ")).rejects.toThrow();
      await expect(service.addProposalComment(coupleId, draft.id, "couple", "Hola")).rejects.toThrow();
      await expect(service.addProposalComment(coupleId, p.id, "admin" as never, "Hola")).rejects.toThrow();
    });

    it("keeps the one-off approve/reject comment separate from the thread", async () => {
      const p = await service.addProposal(coupleId, { title: "Barra", description: "" });
      await service.addProposalComment(coupleId, p.id, "couple", "Pregunta");
      await service.respondToProposal(coupleId, p.id, "approved", "¡Dale!");
      const stored = await byId(p.id);
      expect(stored.coupleComment).toBe("¡Dale!");
      expect(stored.comments).toHaveLength(1);
    });
  });

  describe("S10 viewed", () => {
    it("records the first time the couple sees each presented proposal, never drafts", async () => {
      const p = await service.addProposal(coupleId, { title: "Foto", description: "" });
      const draft = await service.addProposal(coupleId, { title: "Draft", description: "" }, { present: false });
      expect((await byId(p.id)).viewedAt ?? null).toBeNull();

      await service.markProposalsViewed(coupleId);
      const first = (await byId(p.id)).viewedAt;
      expect(first).toEqual(expect.any(String));
      expect((await byId(draft.id)).viewedAt ?? null).toBeNull();

      await new Promise((r) => setTimeout(r, 5));
      await service.markProposalsViewed(coupleId);
      expect((await byId(p.id)).viewedAt).toBe(first);
    });
  });

  describe("S4 vendor confirmations", () => {
    it("stamps confirmedAt when a block becomes confirmed and clears it otherwise", async () => {
      await service.updateBriefBlock(coupleId, "foto", update({ vendor: "Estudio Luz", status: "confirmed" }));
      const stamped = (await block("foto"))?.confirmedAt;
      expect(stamped).toEqual(expect.any(String));

      await new Promise((r) => setTimeout(r, 5));
      await service.updateBriefBlock(coupleId, "foto", update({ vendor: "Estudio Luz", status: "confirmed", contact: "x" }));
      expect((await block("foto"))?.confirmedAt).toBe(stamped);

      await service.updateBriefBlock(coupleId, "foto", update({ vendor: "Estudio Luz", status: "deciding" }));
      expect((await block("foto"))?.confirmedAt ?? null).toBeNull();
    });

    it("notifies the couple of confirmed vendors and team comments, counting them as unread", async () => {
      await service.updateBriefBlock(coupleId, "foto", update({ vendor: "Estudio Luz", status: "confirmed" }));
      await service.updateBriefBlock(coupleId, "civil", update({ status: "confirmed" }));
      const p = await service.addProposal(coupleId, { title: "Barra", description: "" });
      await service.addProposalComment(coupleId, p.id, "couple", "¿Pregunta?");
      await service.addProposalComment(coupleId, p.id, "team", "Respuesta");

      const notes = coupleNotifications(await load());
      expect(notes.map((n) => n.kind).sort()).toEqual(["comment", "proposal", "vendor"]);
      expect(notes.find((n) => n.kind === "vendor")).toMatchObject({ title: "Foto confirmado: Estudio Luz", id: "foto" });
      expect(notes.find((n) => n.kind === "comment")).toMatchObject({ body: "Respuesta" });
      expect(unreadCount(notes, null)).toBe(3);
    });

    it("hides discarded proposals from notifications", async () => {
      const a = await service.addProposal(coupleId, { title: "A", description: "", category: "foto" });
      await service.addProposal(coupleId, { title: "B", description: "", category: "foto" });
      await service.respondToProposal(coupleId, a.id, "approved", "");
      const proposals = coupleNotifications(await load()).filter((n) => n.kind === "proposal");
      expect(proposals.map((n) => n.title)).toEqual(["A"]);
    });

    it("loads proposals and blocks stored before these fields existed", async () => {
      await service.addProposal(coupleId, { title: "Viejo", description: "" });
      const stored = JSON.parse(readFileSync(file, "utf8"));
      for (const p of stored[0].proposals) {
        delete p.category;
        delete p.comments;
        delete p.viewedAt;
      }
      writeFileSync(file, JSON.stringify(stored));
      const couple = await load();
      expect(() => coupleNotifications(couple)).not.toThrow();
      await service.addProposalComment(coupleId, couple.proposals[0].id, "team", "Hola");
      expect((await load()).proposals[0].comments).toHaveLength(1);
    });
  });
});
