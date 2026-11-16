import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { importCouple, rehearseCoupleImport, type CoupleImport } from "./couple-import";
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

  it("still accepts a file in the original shape, without the sections added later", async () => {
    const original = JSON.parse(JSON.stringify(data)) as CoupleImport;
    const { accessCode } = await importCouple(service, original);
    const couple = (await service.login(accessCode))!;
    expect(couple.brief.find((b) => b.key === "cotillon")?.vendor).toBe("Mil Matices");
    expect(couple).toMatchObject({ guests: [], timing: [], vendorTiming: [] });
    expect(couple.family[0]).toMatchObject({ name: "Mercedes", notes: "" });
  });

  it("imports custom rubros, guests, timing, vendor timing, custom song moments and family notes", async () => {
    const { accessCode } = await importCouple(service, {
      partnerA: "Ana",
      partnerB: "Fran",
      weddingDate: "2027-02-08T18:00",
      customRubros: ["Fuegos artificiales"],
      brief: [{ key: "custom-fuegos-artificiales", vendor: "Chispa", contact: "", status: "deciding", owner: "Pau", fields: [{ label: "Momento", detail: "Salida", note: "" }] }],
      budget: {
        items: [{ category: "custom-fuegos-artificiales", vendor: "Chispa", concept: "Fuegos artificiales", amount: 100000, currency: "ARS", adjustment: "ipc", baseMonth: "2026-10", note: "", dueDate: "2027-01-20" }],
      },
      guests: [{ name: "Juan", lastName: "Pérez", status: "confirmed" }, { name: "Rita" }],
      timing: [{ time: "20:00", title: "Ceremonia", note: "Con cuarteto" }],
      vendorTiming: [{ time: "14:00", category: "Ambientación", company: "Deco", contact: "Sole" }],
      music: {
        songs: [{ moment: "import-1", song: "Tema", artist: "Grupo", status: "chosen", note: "" }, { moment: "vals", song: "Vals", artist: "", status: "pending", note: "" }],
        playlistUrl: "",
        mustPlay: "",
        banned: "",
        customMoments: [{ key: "import-1", label: "Lectura especial", group: "Ceremonia" }],
      },
      family: [{ side: "b", name: "Marta", relation: "Abuela", notes: "Vestido verde" }],
    });
    const couple = (await service.login(accessCode))!;

    expect(couple.brief.find((b) => b.key === "custom-fuegos-artificiales")).toMatchObject({ name: "Fuegos artificiales", vendor: "Chispa", owner: "Pau" });
    expect(couple.budget.items[0]).toMatchObject({ category: "custom-fuegos-artificiales", adjustment: "ipc", dueDate: "2027-01-20" });
    expect(couple.guests.map((g) => [g.name, g.lastName, g.status])).toEqual([["Juan", "Pérez", "confirmed"], ["Rita", undefined, "pending"]]);
    expect(couple.timing).toMatchObject([{ time: "20:00", title: "Ceremonia", note: "Con cuarteto" }]);
    expect(couple.vendorTiming).toMatchObject([{ time: "14:00", category: "Ambientación", company: "Deco", contact: "Sole" }]);
    const moment = couple.music.customMoments!.find((m) => m.label === "Lectura especial")!;
    expect(moment.group).toBe("Ceremonia");
    expect(couple.music.songs.find((s) => s.moment === moment.key)).toMatchObject({ song: "Tema", status: "chosen" });
    expect(couple.music.songs.find((s) => s.moment === "vals")?.song).toBe("Vals");
    expect(couple.family).toMatchObject([{ side: "b", name: "Marta", relation: "Abuela", notes: "Vestido verde" }]);
  });

  it("rehearses a file in memory and returns the couple it would create", async () => {
    const couple = await rehearseCoupleImport({ ...data, customRubros: ["Fuegos artificiales"] });
    expect(couple.brief.some((b) => b.key === "custom-fuegos-artificiales")).toBe(true);
    expect(await service.listCouples()).toEqual([]);
  });

  it("stores nothing when any part of the file is invalid", async () => {
    const bad = { ...data, budget: { items: [{ ...data.budget!.items[0], payments: [{ ...data.budget!.items[0].payments![0], arsPerUsd: null }] }] } };
    await expect(importCouple(service, bad)).rejects.toThrow("exchange rate");
    await expect(importCouple(service, { ...data, weddingDate: "08/02/27" })).rejects.toThrow("weddingDate");
    await expect(importCouple(service, { ...data, timing: [{ time: "8 pm", title: "Fiesta", note: "" }] })).rejects.toThrow("HH:MM");
    expect(await service.listCouples()).toEqual([]);
  });
});
