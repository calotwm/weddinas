import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Couple } from "@/core/couple";
import { JsonCoupleRepository } from "./json-couple-repository";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "weddinas-couples-"));
  file = path.join(dir, "db.json");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("JsonCoupleRepository.snapshot", () => {
  it("returns an empty list before the first couple is saved", () => {
    expect(new JsonCoupleRepository(file).snapshot()).toBe("[]");
  });

  it("returns the database file byte for byte", async () => {
    const repo = new JsonCoupleRepository(file);
    await repo.save({ id: "c1", slug: "ana-y-juan", partnerA: "Ana", partnerB: "Juan" } as Couple);
    const snapshot = repo.snapshot();
    expect(snapshot).toBe(readFileSync(file, "utf8"));
    expect(JSON.parse(snapshot)).toEqual([{ id: "c1", slug: "ana-y-juan", partnerA: "Ana", partnerB: "Juan" }]);
  });
});

describe("JsonCoupleRepository.delete", () => {
  it("removes the couple from the file and keeps the others", async () => {
    const repo = new JsonCoupleRepository(file);
    await repo.save({ id: "c1" } as Couple);
    await repo.save({ id: "c2" } as Couple);
    await repo.delete("c1");
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual([{ id: "c2" }]);
    expect(await new JsonCoupleRepository(file).findById("c1")).toBeNull();
  });
});
