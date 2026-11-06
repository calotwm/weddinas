import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("estética, timing and guests", () => {
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

  it("loads couples stored before these sections existed with empty defaults", async () => {
    const stored = JSON.parse(readFileSync(file, "utf8"));
    for (const key of ["aesthetic", "timing", "guests"]) delete stored[0][key];
    writeFileSync(file, JSON.stringify(stored));

    const couple = await load();
    expect(couple.aesthetic).toEqual({ fonts: "", palette: [], photoIds: [] });
    expect(couple.timing).toEqual([]);
    expect(couple.guests).toEqual([]);
  });

  describe("estética", () => {
    it("saves fonts, the dress code and the palette, normalizing colors", async () => {
      await service.saveAesthetic(coupleId, {
        fonts: "  Playfair Display, Lora ",
        dressCode: " Formal, colores claros ",
        palette: [
          { name: " Salvia ", hex: "#9CAF88" },
          { name: "", hex: "#ffffff" },
        ],
      });
      const couple = await load();
      expect(couple.aesthetic.fonts).toBe("Playfair Display, Lora");
      expect(couple.publicInfo.dressCode).toBe("Formal, colores claros");
      expect(couple.aesthetic.palette).toEqual([
        { name: "Salvia", hex: "#9caf88" },
        { name: "", hex: "#ffffff" },
      ]);
    });

    it("rejects colors that are not #rrggbb and leaves the stored data untouched", async () => {
      for (const hex of ["red", "#fff", "#12345g", "9caf88"]) {
        await expect(service.saveAesthetic(coupleId, { fonts: "x", dressCode: "y", palette: [{ name: "A", hex }] })).rejects.toThrow("color");
      }
      expect((await load()).aesthetic.fonts).toBe("");
    });

    it("adds photos up to the limit and removes them returning the file to delete", async () => {
      const ids = Array.from({ length: 12 }, (_, i) => `${i}`.padStart(8, "0") + "-0000-4000-8000-000000000000.jpg");
      for (const id of ids) await service.addAestheticPhoto(coupleId, id);
      await expect(service.addAestheticPhoto(coupleId, "ffffffff-0000-4000-8000-000000000000.jpg")).rejects.toThrow("photos");
      expect((await load()).aesthetic.photoIds).toEqual(ids);

      expect(await service.removeAestheticPhoto(coupleId, ids[0])).toBe(ids[0]);
      expect(await service.removeAestheticPhoto(coupleId, "missing.jpg")).toBeNull();
      expect((await load()).aesthetic.photoIds).toEqual(ids.slice(1));
    });
  });

  describe("timing", () => {
    it("adds, edits and deletes moments kept sorted by time", async () => {
      const party = await service.addTimingItem(coupleId, { time: "21:30", title: " Fiesta ", note: "" });
      await service.addTimingItem(coupleId, { time: "18:00", title: "Ceremonia", note: " En el jardín " });
      expect((await load()).timing.map((t) => [t.time, t.title, t.note])).toEqual([
        ["18:00", "Ceremonia", "En el jardín"],
        ["21:30", "Fiesta", ""],
      ]);

      await service.updateTimingItem(coupleId, party.id, { time: "17:00", title: "Recepción", note: "Con DJ" });
      expect((await load()).timing.map((t) => t.title)).toEqual(["Recepción", "Ceremonia"]);

      await service.deleteTimingItem(coupleId, party.id);
      expect((await load()).timing.map((t) => t.title)).toEqual(["Ceremonia"]);
    });

    it("requires a HH:MM time and a title", async () => {
      await expect(service.addTimingItem(coupleId, { time: "25:00", title: "X", note: "" })).rejects.toThrow("HH:MM");
      await expect(service.addTimingItem(coupleId, { time: "9:00", title: "X", note: "" })).rejects.toThrow("HH:MM");
      await expect(service.addTimingItem(coupleId, { time: "09:00", title: "  ", note: "" })).rejects.toThrow("Title");
      await expect(service.updateTimingItem(coupleId, "nope", { time: "09:00", title: "X", note: "" })).rejects.toThrow("not found");
      expect((await load()).timing).toEqual([]);
    });
  });

  describe("guests", () => {
    it("adds guests in bulk as pending, skipping blank names", async () => {
      const added = await service.addGuests(coupleId, [{ name: " Ana " }, { name: "  " }, { name: "Juan", group: "Amigos", status: "confirmed", table: "3", restriction: "Celíaco" }]);
      expect(added).toHaveLength(2);
      expect((await load()).guests.map(({ name, group, status, table, restriction }) => ({ name, group, status, table, restriction }))).toEqual([
        { name: "Ana", group: "", status: "pending", table: "", restriction: "" },
        { name: "Juan", group: "Amigos", status: "confirmed", table: "3", restriction: "Celíaco" },
      ]);
    });

    it("edits and deletes a guest", async () => {
      const [ana] = await service.addGuests(coupleId, [{ name: "Ana" }]);
      await service.updateGuest(coupleId, ana.id, { name: "Ana P.", group: "Familia", status: "declined", table: "", restriction: "Vegana" });
      expect((await load()).guests[0]).toMatchObject({ id: ana.id, name: "Ana P.", group: "Familia", status: "declined", restriction: "Vegana" });

      await service.deleteGuest(coupleId, ana.id);
      expect((await load()).guests).toEqual([]);
    });

    it("rejects unknown statuses and empty names on edit", async () => {
      const [ana] = await service.addGuests(coupleId, [{ name: "Ana" }]);
      // @ts-expect-error invalid status on purpose
      await expect(service.addGuests(coupleId, [{ name: "X", status: "maybe" }])).rejects.toThrow("status");
      await expect(service.updateGuest(coupleId, ana.id, { name: " ", group: "", status: "pending", table: "", restriction: "" })).rejects.toThrow("Name");
      expect((await load()).guests.map((g) => g.name)).toEqual(["Ana"]);
    });

    it("caps the list size", async () => {
      await service.addGuests(coupleId, Array.from({ length: 1000 }, (_, i) => ({ name: `G${i}` })));
      await expect(service.addGuests(coupleId, [{ name: "One more" }])).rejects.toThrow("guests");
    });
  });
});
