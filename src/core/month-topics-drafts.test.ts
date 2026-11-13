import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { coupleAlerts } from "./alerts";
import { pendingBriefLines, publishedTasks, type BriefBlock, type BriefField, type ChecklistTask, type Couple } from "./couple";
import { PortalService } from "./portal-service";
import { monthTopics } from "./whatsapp";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const task = (id: string, month: string, over: Partial<ChecklistTask> = {}): ChecklistTask => ({ id, title: id, done: false, month, ...over });

describe("month topics, third review round", () => {
  let dir: string;
  let file: string;
  let service: PortalService;
  let coupleId: string;

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-drafts-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
    ({ couple: { id: coupleId } } = await service.createCouple({ partnerA: "Ana", partnerB: "Fran", weddingDate: "2027-02-08T18:00" }));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const tasks = async () => (await service.getCouple(coupleId))!.tasks;

  describe("S7 the couple cannot tick tasks", () => {
    const coupleActions = readFileSync(path.join(process.cwd(), "src/app/portal/actions.ts"), "utf8");
    const exported = [...coupleActions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);

    it("exposes no couple action that toggles a task", () => {
      expect(exported).not.toContain("toggleTask");
      expect(coupleActions).not.toMatch(/portal\.toggleTask\(/);
    });

    it("keeps the team toggle", async () => {
      const t = await service.addTask(coupleId, "Flores", "2026-11");
      await service.toggleTask(coupleId, t.id);
      expect((await tasks())[0].done).toBe(true);
    });
  });

  describe("S9 new topics are drafts until the team publishes them", () => {
    it("stores a topic added by the team as a draft", async () => {
      const t = await service.addTask(coupleId, "Flores", "2026-11");
      expect(t.draft).toBe(true);
      expect((await tasks())[0].draft).toBe(true);
    });

    it("publishes every draft and reports how many", async () => {
      await service.addTask(coupleId, "Flores", "2026-11");
      await service.addTask(coupleId, "Música");
      expect(await service.publishTasks(coupleId)).toBe(2);
      expect((await tasks()).map((t) => t.draft)).toEqual([undefined, undefined]);
      expect(await service.publishTasks(coupleId)).toBe(0);
    });

    it("keeps tasks stored before drafts existed published", async () => {
      const stored = JSON.parse(readFileSync(file, "utf8"));
      const list = Array.isArray(stored) ? stored : stored.couples;
      list[0].tasks = [{ id: "old", title: "Vieja", done: false, month: "2026-11" }];
      writeFileSync(file, JSON.stringify(stored));
      expect(publishedTasks(await tasks()).map((t) => t.id)).toEqual(["old"]);
    });

    it("hides drafts from the couple's list", () => {
      const list = [task("pub", "2026-11"), task("draft", "2026-11", { draft: true })];
      expect(publishedTasks(list).map((t) => t.id)).toEqual(["pub"]);
    });

    it("leaves drafts out of the WhatsApp month topics", () => {
      const list = [
        task("late", "2026-10"),
        task("late-draft", "2026-10", { draft: true }),
        task("now", "2026-11"),
        task("now-done", "2026-11", { done: true }),
        task("now-draft", "2026-11", { draft: true }),
      ];
      expect(monthTopics(list, "2026-11")).toEqual({ topics: ["now"], overdue: ["late"] });
    });

    it("raises no alert for an overdue draft", () => {
      const couple = {
        id: "c1",
        partnerA: "Delfi",
        partnerB: "Juancho",
        proposals: [],
        budget: { usdQuote: "blue", guests: null, items: [] },
        tasks: [task("late", "2026-10"), task("late-draft", "2026-10", { draft: true })],
      } as unknown as Couple;
      const alerts = coupleAlerts([couple], "2026-11-06", new Date("2026-11-06T15:00:00.000Z"));
      expect(alerts.map((a) => a.id)).toEqual(["late"]);
    });
  });
});

describe("S20 pending brief lines across couples", () => {
  const field = (label: string, state?: BriefField["state"]): BriefField => ({ label, detail: `${label} detalle`, note: "", ...(state ? { state } : {}) });
  const block = (key: string, fields: BriefField[]): BriefBlock =>
    ({ key, name: key.toUpperCase(), kind: "vendor", vendor: "", contact: "", status: "searching", owner: "", fields }) as BriefBlock;
  const couple = (id: string, weddingDate: string, brief: BriefBlock[]) =>
    ({ id, partnerA: `A${id}`, partnerB: `B${id}`, weddingDate, brief }) as Pick<Couple, "id" | "partnerA" | "partnerB" | "weddingDate" | "brief">;

  const couples = [
    couple("late", "2027-05-01T19:00", [block("dj", [field("Equipo", "vendor"), field("Horario", "confirmed")])]),
    couple("soon", "2027-01-10T19:00", [
      block("catering", [field("Menú", "couple"), field("Degustación", "weddinas"), field("Sin marcar")]),
      block("foto", [field("Álbum", "vendor")]),
    ]),
    couple("done", "2027-03-01T19:00", [block("dj", [field("Equipo", "confirmed")])]),
  ];

  it("lists open lines grouped by couple by wedding date, skipping confirmed and unmarked lines", () => {
    const groups = pendingBriefLines(couples, "all");
    expect(groups.map((g) => g.couple.id)).toEqual(["soon", "late"]);
    expect(groups[0].lines).toEqual([
      { blockKey: "catering", blockName: "CATERING", label: "Menú", detail: "Menú detalle", state: "couple" },
      { blockKey: "catering", blockName: "CATERING", label: "Degustación", detail: "Degustación detalle", state: "weddinas" },
      { blockKey: "foto", blockName: "FOTO", label: "Álbum", detail: "Álbum detalle", state: "vendor" },
    ]);
  });

  it("filters by who the line waits on", () => {
    expect(pendingBriefLines(couples, "vendor").map((g) => [g.couple.id, g.lines.map((l) => l.label)])).toEqual([
      ["soon", ["Álbum"]],
      ["late", ["Equipo"]],
    ]);
    expect(pendingBriefLines(couples, "weddinas").map((g) => g.couple.id)).toEqual(["soon"]);
    expect(pendingBriefLines(couples, "couple").flatMap((g) => g.lines.map((l) => l.label))).toEqual(["Menú"]);
  });
});
