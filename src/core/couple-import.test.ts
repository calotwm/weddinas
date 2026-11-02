import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importCouple, type CoupleImport } from "./couple-import";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

describe("importCouple", () => {
  let dir: string;
  let service: PortalService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-import-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const data: CoupleImport = {
    partnerA: "Ana",
    partnerB: "Fran",
    weddingDate: "2027-02-08T18:00",
    venue: "Salón",
    ideas: "Boda de campo",
    budget: {
      usdQuote: "blue",
      guests: 200,
      items: [
        {
          category: "foto", vendor: "Luz", concept: "Foto", amount: 2500, currency: "USD", adjustment: "frozen", baseMonth: "2026-04", note: "",
          payments: [{ date: "2026-04-22", amount: 1826500, currency: "ARS", arsPerUsd: 1405, kind: "sena", note: "" }],
        },
      ],
    },
    brief: [{ key: "cotillon", vendor: "Mil Matices", contact: "", status: "confirmed", owner: "Pau", fields: [{ label: "Detalle", detail: "Kit", note: "" }] }],
    music: { songs: [{ moment: "vals", song: "Perfect", artist: "Ed Sheeran", status: "chosen", note: "" }], playlistUrl: "", mustPlay: "", banned: "Gasolina" },
    family: [{ side: "a", name: "Mercedes", relation: "Madre" }],
  };

  it("creates the couple with every section and returns a working access code", async () => {
    const { coupleId, accessCode } = await importCouple(service, data);
    const couple = (await service.login(accessCode))!;

    expect(couple.id).toBe(coupleId);
    expect(couple).toMatchObject({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00", ideas: "Boda de campo" });
    expect(couple.publicInfo.venue).toBe("Salón");
    expect(couple.budget).toMatchObject({ usdQuote: "blue", guests: 200 });
    expect(couple.budget.items[0].payments[0]).toMatchObject({ amount: 1826500, arsPerUsd: 1405 });
    expect(couple.brief.find((b) => b.key === "cotillon")).toMatchObject({ vendor: "Mil Matices", status: "confirmed" });
    expect(couple.music.songs.find((s) => s.moment === "vals")).toMatchObject({ song: "Perfect", status: "chosen" });
    expect(couple.music.banned).toBe("Gasolina");
    expect(couple.family.map((m) => m.name)).toEqual(["Mercedes"]);
  });

  it("stores nothing when any part of the file is invalid", async () => {
    const bad = { ...data, budget: { items: [{ ...data.budget!.items[0], payments: [{ ...data.budget!.items[0].payments![0], arsPerUsd: null }] }] } };
    await expect(importCouple(service, bad)).rejects.toThrow("exchange rate");
    await expect(importCouple(service, { ...data, weddingDate: "08/02/27" })).rejects.toThrow("weddingDate");
    expect(await service.listCouples()).toEqual([]);
  });
});
