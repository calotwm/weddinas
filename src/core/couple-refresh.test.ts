import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importCouple, refreshCoupleFromImport, type CoupleImport } from "./couple-import";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const RECEIPT = "11111111-1111-4111-8111-111111111111.pdf";
const MERCEDES = "22222222-2222-4222-8222-222222222222.jpg";
const TITO = "33333333-3333-4333-8333-333333333333.jpg";

let dir: string;
let service: PortalService;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "weddinas-refresh-"));
  service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

const original: CoupleImport = {
  partnerA: "Ana",
  partnerB: "Fran",
  weddingDate: "2027-02-08T18:00",
  ideas: "Old ideas",
  budget: {
    items: [
      {
        category: "foto", vendor: "Luz", concept: "Foto", amount: 2500, currency: "USD", adjustment: "frozen", baseMonth: "2026-04", note: "",
        payments: [{ date: "2026-04-22", amount: 1000, currency: "USD", arsPerUsd: null, kind: "sena", note: "" }],
      },
    ],
  },
  guests: [{ name: "Old guest" }],
  family: [{ side: "a", name: "Mercedes", relation: "Madre" }, { side: "b", name: "Tito", relation: "Tío" }],
};

const sheets: CoupleImport = {
  partnerA: "Ana",
  partnerB: "Fran",
  weddingDate: "2027-02-09T19:00",
  venue: "Estancia",
  ideas: "New ideas",
  customRubros: ["Fuegos artificiales"],
  brief: [{ key: "cotillon", vendor: "Mil Matices", contact: "", status: "confirmed", owner: "Pau", fields: [] }],
  budget: {
    guests: 271,
    items: [
      {
        category: "foto", vendor: "Luz", concept: "Foto", amount: 2500, currency: "USD", adjustment: "frozen", baseMonth: "2026-04", note: "",
        payments: [
          { date: "2026-04-22", amount: 1000, currency: "USD", arsPerUsd: null, kind: "sena", note: "" },
          { date: "2026-09-01", amount: 1500, currency: "USD", arsPerUsd: null, kind: "saldo", note: "" },
        ],
      },
    ],
  },
  guests: [{ name: "Juan" }, { name: "Rita" }],
  timing: [{ time: "20:00", title: "Ceremonia", note: "" }],
  vendorTiming: [{ time: "14:00", category: "Ambientación", company: "Deco", contact: "Sole" }],
  music: { songs: [{ moment: "vals", song: "Perfect", artist: "Ed Sheeran", status: "chosen", note: "" }], playlistUrl: "", mustPlay: "", banned: "" },
  family: [{ side: "a", name: "Mercedes", relation: "Mamá", notes: "Vestido azul" }, { side: "a", name: "Rosa", relation: "Abuela" }],
};

/** A couple imported earlier and then worked on by the team in the app. */
async function existingCouple() {
  const { coupleId, accessCode } = await importCouple(service, original);
  await service.addProposal(coupleId, { title: "Casa del Sol", description: "" });
  await service.addTask(coupleId, "Prueba de vestido");
  const rsvpToken = await service.rsvpToken(coupleId);
  const loaded = (await service.getCouple(coupleId))!;
  const item = loaded.budget.items[0];
  await service.setPaymentReceipt(coupleId, item.id, item.payments[0].id, RECEIPT);
  await service.setFamilyPhoto(coupleId, loaded.family[0].id, MERCEDES);
  await service.setFamilyPhoto(coupleId, loaded.family[1].id, TITO);
  return { coupleId, accessCode, rsvpToken, before: (await service.getCouple(coupleId))! };
}

describe("refreshCoupleFromImport", () => {
  it("replaces the sheet sections and keeps the team's work, the access code and the links", async () => {
    const { coupleId, accessCode, rsvpToken, before } = await existingCouple();

    await refreshCoupleFromImport(service, coupleId, sheets);

    const after = (await service.login(accessCode))!;
    expect(after.id).toBe(coupleId);
    expect(after).toMatchObject({ slug: before.slug, partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-09T19:00", ideas: "New ideas" });
    expect(await service.currentRsvpToken(coupleId)).toBe(rsvpToken);
    expect(after.proposals.map((p) => p.title)).toEqual(["Casa del Sol"]);
    expect(after.tasks).toEqual(before.tasks);
    expect(after.publicInfo.venue).toBe("Estancia");
    expect(after.guests.map((g) => g.name)).toEqual(["Juan", "Rita"]);
    expect(after.timing.map((t) => t.title)).toEqual(["Ceremonia"]);
    expect(after.vendorTiming.map((t) => t.company)).toEqual(["Deco"]);
    expect(after.brief.find((b) => b.key === "cotillon")).toMatchObject({ vendor: "Mil Matices", status: "confirmed" });
    expect(after.brief.some((b) => b.name === "Fuegos artificiales")).toBe(true);
    expect(after.music.songs.find((s) => s.moment === "vals")).toMatchObject({ song: "Perfect", status: "chosen" });
    expect(after.budget.guests).toBe(271);
    expect(after.budget.items[0].payments.map((p) => [p.amount, p.receiptId])).toEqual([[1000, RECEIPT], [1500, undefined]]);
    expect(after.family.map((m) => [m.name, m.relation, m.notes, m.photoId])).toEqual([
      ["Mercedes", "Mamá", "Vestido azul", MERCEDES],
      ["Rosa", "Abuela", "", null],
    ]);
  });

  it("keeps the venue when the file has none", async () => {
    const { coupleId } = await existingCouple();
    await service.updatePublicInfo(coupleId, { venue: "Salón" });
    await refreshCoupleFromImport(service, coupleId, { ...sheets, venue: undefined });
    expect((await service.getCouple(coupleId))!.publicInfo.venue).toBe("Salón");
  });

  it("changes nothing when the file is invalid", async () => {
    const { coupleId, before } = await existingCouple();
    await expect(refreshCoupleFromImport(service, coupleId, { ...sheets, timing: [{ time: "8 pm", title: "Fiesta", note: "" }] })).rejects.toThrow("HH:MM");
    expect(await service.getCouple(coupleId)).toEqual(before);
  });

  it("rejects an unknown couple", async () => {
    await expect(refreshCoupleFromImport(service, "missing", sheets)).rejects.toThrow("Couple not found");
  });

  it("rejects another couple's file and changes nothing; names match regardless of order, case and accents", async () => {
    const { coupleId, before } = await existingCouple();
    await expect(refreshCoupleFromImport(service, coupleId, { ...sheets, partnerB: "Santi" })).rejects.toThrow("another couple");
    expect(await service.getCouple(coupleId)).toEqual(before);
    await refreshCoupleFromImport(service, coupleId, { ...sheets, partnerA: "FRÁN", partnerB: "ana" });
    expect((await service.getCouple(coupleId))!.ideas).toBe("New ideas");
  });
});

describe("PortalService.deleteCouple", () => {
  it("removes only that couple, and its access code stops working", async () => {
    const a = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" });
    const b = await service.createCouple({ partnerA: "Sol", partnerB: "Leo", weddingDate: "2027-03-08T18:00" });

    await service.deleteCouple(a.couple.id);

    expect((await service.listCouples()).map((c) => c.id)).toEqual([b.couple.id]);
    expect(await service.login(a.accessCode)).toBeNull();
    expect(await service.login(b.accessCode)).not.toBeNull();
  });

  it("rejects an unknown couple", async () => {
    await expect(service.deleteCouple("missing")).rejects.toThrow("Couple not found");
  });
});
