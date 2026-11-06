import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Settings, SettingsRepository } from "@/core/ports";

/** Team-wide settings in one JSON file next to the couples database (same atomic write approach). */
export class JsonSettingsRepository implements SettingsRepository {
  constructor(private readonly filePath: string) {}

  async get(): Promise<Settings> {
    if (!existsSync(this.filePath)) return {};
    try {
      const data = JSON.parse(readFileSync(this.filePath, "utf8"));
      return data && typeof data === "object" && !Array.isArray(data) ? (data as Settings) : {};
    } catch {
      return {};
    }
  }

  async save(settings: Settings): Promise<void> {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(settings, null, 2));
    renameSync(tmp, this.filePath);
  }
}
