import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";
import { timingInput } from "@/components/planner/section-forms";
import { PortalService } from "./portal-service";
import { coupleTiming, durationParts, nextTimingTime, normalizeClock, timingDurationLabels } from "./timing";

vi.mock("server-only", () => ({}));
vi.mock("@/server/container", () => ({ portal: {}, files: {} }));

describe("S7 24-hour clock", () => {
  it("reads times as typed on a 24-hour clock, without am/pm", () => {
    expect(normalizeClock("17:30")).toBe("17:30");
    expect(normalizeClock("9:05")).toBe("09:05");
    expect(normalizeClock(" 0:00 ")).toBe("00:00");
    expect(normalizeClock("24:00")).toBeNull();
    expect(normalizeClock("5:30 pm")).toBeNull();
    expect(normalizeClock("17.30")).toBe("17:30");
  });
});

describe("S6 durations like the agency's sheet", () => {
  it("splits a duration into Horas and Minutos and shows the typed duration, else the time until the next moment", () => {
    expect(durationParts(90)).toEqual({ hours: 1, minutes: 30 });
    expect(durationParts(undefined)).toEqual({ hours: null, minutes: null });
    const items = [
      { time: "17:00", durationMin: 30 },
      { time: "17:30" },
      { time: "18:00", durationMin: 0 },
      { time: "19:30" },
    ];
    expect(timingDurationLabels(items)).toEqual(["30 min", "30 min", null, null]);
  });

  it("suggests the next moment's time as the last one's time plus its duration", () => {
    expect(nextTimingTime([])).toBe("");
    expect(nextTimingTime([{ time: "17:00", durationMin: 30 }, { time: "23:30", durationMin: 60 }])).toBe("00:30");
    expect(nextTimingTime([{ time: "17:00" }])).toBe("");
  });

  it("reads the row form: horario, horas, minutos, actividad, descripción, solo equipo and the team columns", () => {
    const form = new FormData();
    form.set("time", "9:05");
    form.set("hours", "1");
    form.set("minutes", "30");
    form.set("title", "Recepción");
    form.set("note", "Fotos novios + familia");
    form.set("teamOnly", "on");
    form.set("col:c1", "Sorpresa: video");
    expect(timingInput(form)).toEqual({ time: "09:05", durationMin: 90, title: "Recepción", note: "Fotos novios + familia", teamOnly: true, team: { c1: "Sorpresa: video" } });
    form.set("hours", "");
    form.set("minutes", "");
    expect(timingInput(form)?.durationMin).toBeUndefined();
    form.set("time", "5:30 pm");
    expect(timingInput(form)).toBeNull();
  });
});

describe("timing service (S6, S8)", () => {
  let dir: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-timing9-"));
    service = new PortalService(new JsonCoupleRepository(path.join(dir, "db.json")));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const load = async () => (await service.getCouple(coupleId))!;

  it("starts with four team-only columns and Horas/Minutos shown; columns can be renamed, added and removed", async () => {
    let c = await load();
    expect(c.timingSettings.showHoursMinutes).toBe(true);
    expect(c.timingSettings.columns.map((col) => col.name)).toEqual(["Equipo 1", "Equipo 2", "Equipo 3", "Equipo 4"]);

    const [first, second] = c.timingSettings.columns;
    const item = await service.addTimingItem(coupleId, { time: "17:00", title: "Cita", note: "", durationMin: 30, team: { [first.id]: "Llevar velas", [second.id]: "x", nope: "ignored" } });
    expect((await load()).timing[0]).toMatchObject({ id: item.id, durationMin: 30, team: { [first.id]: "Llevar velas", [second.id]: "x" } });
    expect((await load()).timing[0].team).not.toHaveProperty("nope");

    await service.renameTimingColumn(coupleId, first.id, " Música ");
    await service.addTimingColumn(coupleId, "Luces");
    await service.deleteTimingColumn(coupleId, second.id);
    c = await load();
    expect(c.timingSettings.columns.map((col) => col.name)).toEqual(["Música", "Equipo 3", "Equipo 4", "Luces"]);
    expect(c.timing[0].team).toEqual({ [first.id]: "Llevar velas" });
    await expect(service.addTimingColumn(coupleId, "  ")).rejects.toThrow();

    await service.setTimingHoursMinutesShown(coupleId, false);
    expect((await load()).timingSettings.showHoursMinutes).toBe(false);
  });

  it("keeps team-only moments and team columns away from the couple", async () => {
    const [col] = (await load()).timingSettings.columns;
    await service.addTimingItem(coupleId, { time: "17:00", title: "Cita", note: "", team: { [col.id]: "Sorpresa" } });
    await service.addTimingItem(coupleId, { time: "21:00", title: "Video sorpresa", note: "", teamOnly: true });
    const shown = coupleTiming((await load()).timing);
    expect(shown.map((t) => t.title)).toEqual(["Cita"]);
    expect(shown[0]).not.toHaveProperty("team");
  });

  it("keeps line breaks in the description and team columns (phase 10 S3)", async () => {
    const [col] = (await load()).timingSettings.columns;
    await service.addTimingItem(coupleId, { time: "17:00", title: "Cita", note: "Primero fotos\nDespués brindis", team: { [col.id]: "Velas\nFósforos" } });
    const [saved] = (await load()).timing;
    expect(saved.note).toBe("Primero fotos\nDespués brindis");
    expect(saved.team?.[col.id]).toBe("Velas\nFósforos");
  });
});
