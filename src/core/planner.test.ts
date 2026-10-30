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

    it("rejects non-positive amounts and unknown categories", async () => {
      await expect(service.addBudgetItem(coupleId, { ...base, amount: 0 })).rejects.toThrow();
      await expect(service.addBudgetItem(coupleId, { ...base, category: "nope" })).rejects.toThrow();
      expect((await load()).budget.items).toEqual([]);
    });

    it("stores the dollar quote and guest count settings", async () => {
      await service.updateBudgetSettings(coupleId, { usdQuote: "oficial", guests: 180 });
      expect((await load()).budget).toMatchObject({ usdQuote: "oficial", guests: 180 });
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

  it("adds family members, sets their photo and removes them returning the photo to delete", async () => {
    const member = await service.addFamilyMember(coupleId, { side: "b", name: "Tío Juan", relation: "Tío" });
    expect(await service.setFamilyPhoto(coupleId, member.id, "photo-1")).toBeNull();
    expect(await service.setFamilyPhoto(coupleId, member.id, "photo-2")).toBe("photo-1");
    expect((await load()).family).toEqual([{ ...member, photoId: "photo-2" }]);
    expect(await service.removeFamilyMember(coupleId, member.id)).toBe("photo-2");
    expect((await load()).family).toEqual([]);
  });
});
