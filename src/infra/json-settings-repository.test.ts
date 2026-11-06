import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonSettingsRepository } from "./json-settings-repository";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "weddinas-settings-"));
  file = path.join(dir, "nested", "settings.json");
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("JsonSettingsRepository", () => {
  it("returns empty settings when the file does not exist yet", async () => {
    expect(await new JsonSettingsRepository(file).get()).toEqual({});
  });

  it("persists settings to disk and reads them back from a new instance", async () => {
    await new JsonSettingsRepository(file).save({ welcomeTemplate: "Hola {nombres}" });
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ welcomeTemplate: "Hola {nombres}" });
    expect(await new JsonSettingsRepository(file).get()).toEqual({ welcomeTemplate: "Hola {nombres}" });
  });

  it("returns empty settings when the file is not valid JSON", async () => {
    await new JsonSettingsRepository(file).save({});
    writeFileSync(file, "{oops");
    expect(await new JsonSettingsRepository(file).get()).toEqual({});
  });
});
