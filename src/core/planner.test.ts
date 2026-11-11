import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BRIEF_CATALOG, SONG_MOMENT_KEYS } from "./brief-catalog";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("planner workspace", () => {
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

  it("loads couples stored before the planner fields existed with defaults", async () => {
    const stored = JSON.parse(readFileSync(file, "utf8"));
    for (const key of ["budget", "brief", "ideas", "music", "family"]) delete stored[0][key];
    writeFileSync(file, JSON.stringify(stored));

    const couple = await load();
    expect(couple.budget).toEqual({ usdQuote: "blue", guests: null, items: [] });
    expect(couple.brief.map((b) => b.key)).toEqual(BRIEF_CATALOG.filter((b) => b.core).map((b) => b.key));
    expect(couple.music.songs.map((s) => s.moment)).toEqual(SONG_MOMENT_KEYS);
    expect(couple.family).toEqual([]);
    expect(couple.ideas).toBe("");

    await service.addFamilyMember(coupleId, { side: "a", name: "Abuela", relation: "Abuela" });
    expect((await load()).family).toHaveLength(1);
  });

  describe("budget", () => {
    const base = { category: "catering", vendor: "Guillen", concept: "Menú", amount: 1000, currency: "ARS" as const, adjustment: "ipc" as const, baseMonth: "2026-10", note: "" };

    it("adds, updates and deletes items and payments", async () => {
      const item = await service.addBudgetItem(coupleId, base);
      await service.updateBudgetItem(coupleId, item.id, { ...base, amount: 1500 });
      const payment = await service.addPayment(coupleId, item.id, { date: "2026-10-30", amount: 500, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" });

      let saved = (await load()).budget.items[0];
      expect(saved.amount).toBe(1500);
      expect(saved.payments).toEqual([payment]);

      await service.deletePayment(coupleId, item.id, payment.id);
      expect((await load()).budget.items[0].payments).toEqual([]);
      await service.deleteBudgetItem(coupleId, item.id);
      saved = (await load()).budget.items[0];
      expect(saved).toBeUndefined();
    });

    it("requires the exchange rate for a payment in another currency", async () => {
      const item = await service.addBudgetItem(coupleId, { ...base, currency: "USD", adjustment: "frozen" });
      await expect(
        service.addPayment(coupleId, item.id, { date: "2026-10-30", amount: 100, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" }),
      ).rejects.toThrow("exchange rate");
      expect((await load()).budget.items[0].payments).toEqual([]);
    });

    it("refuses to change the currency of an item that already has payments", async () => {
      const item = await service.addBudgetItem(coupleId, base);
      await service.addPayment(coupleId, item.id, { date: "2026-10-30", amount: 400, currency: "ARS", arsPerUsd: null, kind: "sena", note: "" });
      await expect(service.updateBudgetItem(coupleId, item.id, { ...base, currency: "USD" })).rejects.toThrow("currency");
      expect((await load()).budget.items[0].currency).toBe("ARS");

      await service.updateBudgetItem(coupleId, item.id, { ...base, amount: 2000 });
      expect((await load()).budget.items[0].amount).toBe(2000);
    });

    it("rejects non-positive amounts and unknown categories", async () => {
      await expect(service.addBudgetItem(coupleId, { ...base, amount: 0 })).rejects.toThrow();
      await expect(service.addBudgetItem(coupleId, { ...base, category: "nope" })).rejects.toThrow();
      expect((await load()).budget.items).toEqual([]);
    });

    it("stores an optional next due date and rejects malformed ones", async () => {
      const item = await service.addBudgetItem(coupleId, { ...base, dueDate: "2026-11-20" });
      expect((await load()).budget.items[0].dueDate).toBe("2026-11-20");
      await service.updateBudgetItem(coupleId, item.id, { ...base, dueDate: "" });
      expect((await load()).budget.items[0].dueDate).toBe("");
      await expect(service.addBudgetItem(coupleId, { ...base, dueDate: "20/11" })).rejects.toThrow();
    });

    it("stores the dollar quote and guest count settings", async () => {
      await service.updateBudgetSettings(coupleId, { usdQuote: "oficial", guests: 180 });
      expect((await load()).budget).toMatchObject({ usdQuote: "oficial", guests: 180 });
    });
  });

  describe("couple details", () => {
    it("stores the WhatsApp number normalized, clears it, and rejects invalid ones without changing anything", async () => {
      await service.updateCoupleDetails(coupleId, { whatsapp: "11 2233-4455" });
      expect((await load()).whatsapp).toBe("5491122334455");

      const before = readFileSync(file, "utf8");
      await expect(service.updateCoupleDetails(coupleId, { partnerA: "Otro", whatsapp: "123" })).rejects.toThrow();
      expect(readFileSync(file, "utf8")).toBe(before);

      await service.updateCoupleDetails(coupleId, { partnerA: "Delfina" });
      expect(await load()).toMatchObject({ partnerA: "Delfina", whatsapp: "5491122334455" });

      await service.updateCoupleDetails(coupleId, { whatsapp: "" });
      expect((await load()).whatsapp).toBeUndefined();
    });
  });

  describe("brief", () => {
    it("adds catalog blocks once and updates and removes them", async () => {
      await service.addBriefBlock(coupleId, "cotillon");
      await service.addBriefBlock(coupleId, "cotillon");
      expect((await load()).brief.filter((b) => b.key === "cotillon")).toHaveLength(1);
      await expect(service.addBriefBlock(coupleId, "nope")).rejects.toThrow();

      const block = (await load()).brief.find((b) => b.key === "cotillon")!;
      const fields = block.fields.map((f, i) => (i === 0 ? { ...f, detail: "50% seña" } : f));
      await service.updateBriefBlock(coupleId, "cotillon", { vendor: "Mil Matices", contact: "wpp", status: "confirmed", owner: "Pau", fields });
      expect((await load()).brief.find((b) => b.key === "cotillon")).toMatchObject({ vendor: "Mil Matices", status: "confirmed", owner: "Pau", fields });

      await service.removeBriefBlock(coupleId, "cotillon");
      expect((await load()).brief.some((b) => b.key === "cotillon")).toBe(false);
    });

    it("keeps each line's state and drops unknown ones", async () => {
      await service.addBriefBlock(coupleId, "cotillon");
      const [first, second, third] = (await load()).brief.find((b) => b.key === "cotillon")!.fields;
      const fields = [
        { ...first, state: "couple" as const },
        { ...second, state: "bogus" as never },
        { ...third, state: "" as never },
      ];
      await service.updateBriefBlock(coupleId, "cotillon", { vendor: "", contact: "", status: "searching", owner: "", fields });
      const saved = (await load()).brief.find((b) => b.key === "cotillon")!.fields;
      expect(saved.slice(0, 3).map((f) => f.state)).toEqual(["couple", undefined, undefined]);
    });

    it("gives stored vendor blocks the common fields, renaming old labels without losing their detail", async () => {
      const stored = JSON.parse(readFileSync(file, "utf8"));
      const espacio = stored[0].brief.find((b: { key: string }) => b.key === "espacio");
      espacio.fields = [
        { label: "Pago", detail: "50% seña", note: "" },
        { label: "Mobiliario incluido", detail: "Sillas Tiffany", note: "interno" },
        { label: "Estacionamiento", detail: "Sí", note: "" },
      ];
      writeFileSync(file, JSON.stringify(stored));

      const fields = (await load()).brief.find((b) => b.key === "espacio")!.fields;
      expect(fields.map((f) => f.label)).toEqual([...BRIEF_CATALOG.find((b) => b.key === "espacio")!.fields, "Estacionamiento"]);
      expect(fields.find((f) => f.label === "Mobiliario")).toEqual({ label: "Mobiliario", detail: "Sillas Tiffany", note: "interno" });
      expect(fields.find((f) => f.label === "Pago")!.detail).toBe("50% seña");
    });

    it("saves the general ideas", async () => {
      await service.updateIdeas(coupleId, "Boda de campo");
      expect((await load()).ideas).toBe("Boda de campo");
    });
  });

  it("saves music keeping only catalog moments and valid statuses", async () => {
    await service.saveMusic(coupleId, {
      songs: [
        { moment: "vals", song: "Perfect", artist: "Ed Sheeran", status: "chosen", note: "" },
        { moment: "inventado", song: "x", artist: "y", status: "chosen", note: "" },
        { moment: "ramo", song: "z", artist: "", status: "bogus" as never, note: "" },
      ],
      playlistUrl: "https://open.spotify.com/playlist/1",
      mustPlay: "Cumbia",
      banned: "Reggaeton",
    });
    const music = (await load()).music;
    expect(music.songs.map((s) => s.moment)).toEqual(SONG_MOMENT_KEYS);
    expect(music.songs.find((s) => s.moment === "vals")).toMatchObject({ song: "Perfect", status: "chosen" });
    expect(music.songs.find((s) => s.moment === "ramo")).toMatchObject({ song: "z", status: "pending" });
    expect(music).toMatchObject({ playlistUrl: "https://open.spotify.com/playlist/1", mustPlay: "Cumbia", banned: "Reggaeton" });
  });

  describe("attachments", () => {
    const file = (id: string) => ({ id: `${id}.pdf`, name: "Pack contratado.pdf", size: 1200, internal: false });

    it("attaches files to brief blocks, proposals and reports and removes them returning the file to delete", async () => {
      const proposal = await service.addProposal(coupleId, { title: "Ambientación", description: "" });
      const report = await service.addReport(coupleId, { title: "Avance", body: "" });

      const a = await service.addAttachment(coupleId, { kind: "brief", key: "dj" }, file("a"));
      await service.addAttachment(coupleId, { kind: "proposal", id: proposal.id }, file("b"));
      await service.addAttachment(coupleId, { kind: "report", id: report.id }, { ...file("c"), internal: true });

      let couple = await load();
      expect(a).toMatchObject({ id: "a.pdf", name: "Pack contratado.pdf", size: 1200, internal: false });
      expect(couple.brief.find((b) => b.key === "dj")!.attachments).toEqual([a]);
      expect(couple.proposals[0].attachments!.map((x) => x.id)).toEqual(["b.pdf"]);
      expect(couple.reports[0].attachments![0].internal).toBe(false); // reports and proposals are always shared

      expect(await service.removeAttachment(coupleId, { kind: "brief", key: "dj" }, "a.pdf")).toBe("a.pdf");
      expect(await service.removeAttachment(coupleId, { kind: "brief", key: "dj" }, "a.pdf")).toBeNull();
      couple = await load();
      expect(couple.brief.find((b) => b.key === "dj")!.attachments).toEqual([]);
    });

    it("keeps only a safe file name and rejects unknown targets", async () => {
      const a = await service.addAttachment(coupleId, { kind: "brief", key: "dj" }, { ...file("a"), name: "..\\..\\x/Fac<tura>.pdf" });
      expect(a.name).toBe("Factura.pdf");
      await expect(service.addAttachment(coupleId, { kind: "brief", key: "nope" }, file("b"))).rejects.toThrow("not found");
      await expect(service.addAttachment(coupleId, { kind: "proposal", id: "nope" }, file("b"))).rejects.toThrow("not found");
    });

    it("returns every attached file when their block, proposal or report is deleted", async () => {
      const proposal = await service.addProposal(coupleId, { title: "P", description: "" });
      const report = await service.addReport(coupleId, { title: "R", body: "" });
      await service.addAttachment(coupleId, { kind: "brief", key: "dj" }, file("a"));
      await service.addAttachment(coupleId, { kind: "proposal", id: proposal.id }, file("b"));
      await service.addAttachment(coupleId, { kind: "report", id: report.id }, file("c"));

      expect(await service.removeBriefBlock(coupleId, "dj")).toEqual(["a.pdf"]);
      expect(await service.deleteProposal(coupleId, proposal.id)).toEqual(["b.pdf"]);
      expect(await service.deleteReport(coupleId, report.id)).toEqual(["c.pdf"]);
    });
  });

  it("sets and clears the cover photo, which the public page exposes by slug", async () => {
    expect(await service.setCoverPhoto(coupleId, "p1.jpg")).toBeNull();
    expect(await service.setCoverPhoto(coupleId, "p2.jpg")).toBe("p1.jpg");
    const { slug } = await load();
    expect(await service.coverPhoto(slug)).toEqual({ coupleId, photoId: "p2.jpg" });
    expect(await service.setCoverPhoto(coupleId, null)).toBe("p2.jpg");
    expect(await service.coverPhoto(slug)).toBeNull();
    expect(await service.coverPhoto("nope")).toBeNull();
  });

  it("adds family members, sets their photo and removes them returning the photo to delete", async () => {
    const member = await service.addFamilyMember(coupleId, { side: "b", name: "Tío Juan", relation: "Tío" });
    expect(await service.setFamilyPhoto(coupleId, member.id, "photo-1")).toBeNull();
    expect(await service.setFamilyPhoto(coupleId, member.id, "photo-2")).toBe("photo-1");
    expect((await load()).family).toEqual([{ ...member, photoId: "photo-2" }]);
    expect(await service.removeFamilyMember(coupleId, member.id)).toBe("photo-2");
    expect((await load()).family).toEqual([]);
  });

  describe("proposals and notifications", () => {
    it("keeps drafts hidden until they are presented, and the couple cannot answer a draft", async () => {
      const draft = await service.addProposal(coupleId, { title: "Barra", description: "Tragos" }, { present: false });
      expect(draft.presentedAt).toBeNull();
      await expect(service.respondToProposal(coupleId, draft.id, "approved", "")).rejects.toThrow();

      await service.presentProposal(coupleId, draft.id);
      const presented = (await load()).proposals[0];
      expect(presented.presentedAt).toEqual(expect.any(String));
      await service.respondToProposal(coupleId, draft.id, "approved", "");
      expect((await load()).proposals[0].status).toBe("approved");
    });

    it("presents right away by default", async () => {
      const p = await service.addProposal(coupleId, { title: "Foto", description: "Cobertura" });
      expect(p.presentedAt).toEqual(p.createdAt);
    });

    it("records when the couple opened their notifications", async () => {
      expect((await load()).notificationsSeenAt ?? null).toBeNull();
      await service.markNotificationsSeen(coupleId);
      expect((await load()).notificationsSeenAt).toEqual(expect.any(String));
    });
  });
});
