import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checklistSections, type ChecklistTask } from "./couple";
import { PortalService } from "./portal-service";
import { JsonCoupleRepository } from "@/infra/json-couple-repository";

const task = (id: string, month?: string, done = false): ChecklistTask => ({ id, title: id, done, ...(month ? { month } : {}) });

describe("checklistSections", () => {
  it("splits open past-month tasks, this month, next months and tasks without month", () => {
    const tasks = [
      task("late", "2026-09"),
      task("late-done", "2026-10", true),
      task("now", "2026-11"),
      task("now-done", "2026-11", true),
      task("dec", "2026-12"),
      task("jan", "2027-01"),
      task("free"),
    ];
    const s = checklistSections(tasks, "2026-11");
    expect(s.overdue.map((t) => t.id)).toEqual(["late"]);
    expect(s.thisMonth.map((t) => t.id)).toEqual(["now", "now-done"]);
    expect(s.upcoming.map((g) => [g.month, g.tasks.map((t) => t.id)])).toEqual([["2026-12", ["dec"]], ["2027-01", ["jan"]]]);
    expect(s.noMonth.map((t) => t.id)).toEqual(["free"]);
    expect(s.pastDone.map((t) => t.id)).toEqual(["late-done"]);
  });

  it("orders overdue tasks and upcoming months chronologically", () => {
    const s = checklistSections([task("b", "2026-10"), task("a", "2026-08"), task("y", "2027-02"), task("x", "2026-12")], "2026-11");
    expect(s.overdue.map((t) => t.id)).toEqual(["a", "b"]);
    expect(s.upcoming.map((g) => g.month)).toEqual(["2026-12", "2027-02"]);
  });
});

describe("PortalService checklist months", () => {
  let dir: string;
  let file: string;
  let service: PortalService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-tasks-"));
    file = path.join(dir, "db.json");
    service = new PortalService(new JsonCoupleRepository(file));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const create = () => service.createCouple({ partnerA: "Ana", partnerB: "Juan", weddingDate: "2027-03-20T19:00" });

  it("adds tasks with an optional month and edits it", async () => {
    const { couple } = await create();
    const dated = await service.addTask(couple.id, "Flores", "2026-12");
    const free = await service.addTask(couple.id, "Música");
    expect(dated.month).toBe("2026-12");
    expect(free.month).toBeUndefined();

    await service.setTaskMonth(couple.id, dated.id, "2027-01");
    await service.setTaskMonth(couple.id, free.id, "2026-11");
    let tasks = (await service.getCouple(couple.id))!.tasks;
    expect(tasks.map((t) => t.month)).toEqual(["2027-01", "2026-11"]);

    await service.setTaskMonth(couple.id, dated.id, null);
    tasks = (await service.getCouple(couple.id))!.tasks;
    expect(tasks[0].month).toBeUndefined();
  });

  it("rejects months that are not YYYY-MM", async () => {
    const { couple } = await create();
    await expect(service.addTask(couple.id, "Flores", "diciembre")).rejects.toThrow();
    const t = await service.addTask(couple.id, "Flores");
    await expect(service.setTaskMonth(couple.id, t.id, "2026-13")).rejects.toThrow();
  });

  it("keeps toggling and deleting tasks", async () => {
    const { couple } = await create();
    const t = await service.addTask(couple.id, "Flores", "2026-12");
    await service.toggleTask(couple.id, t.id);
    expect((await service.getCouple(couple.id))!.tasks[0]).toMatchObject({ done: true, month: "2026-12" });
    await service.deleteTask(couple.id, t.id);
    expect((await service.getCouple(couple.id))!.tasks).toEqual([]);
  });

  it("loads tasks stored before months existed", async () => {
    const { couple } = await create();
    const stored = JSON.parse(JSON.stringify(await new JsonCoupleRepository(file).list()));
    stored[0].tasks = [{ id: "old", title: "Vieja", done: false }];
    writeFileSync(file, JSON.stringify(stored));
    const s = checklistSections((await service.getCouple(couple.id))!.tasks, "2026-11");
    expect(s.noMonth.map((t) => t.id)).toEqual(["old"]);
  });
});
