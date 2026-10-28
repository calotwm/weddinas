import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Couple } from "@/core/couple";
import type { CoupleRepository } from "@/core/ports";

/**
 * Prototype adapter: one JSON file on local disk. Not suitable for serverless
 * hosting (read-only filesystem); swap for a database adapter in production.
 */
export class JsonCoupleRepository implements CoupleRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<Couple[]> {
    return this.read();
  }

  async findById(id: string): Promise<Couple | null> {
    return this.read().find((c) => c.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Couple | null> {
    return this.read().find((c) => c.slug === slug) ?? null;
  }

  async findByAccessCodeHash(hash: string): Promise<Couple | null> {
    return this.read().find((c) => c.accessCodeHash === hash) ?? null;
  }

  async save(couple: Couple): Promise<void> {
    const couples = this.read();
    const index = couples.findIndex((c) => c.id === couple.id);
    if (index === -1) couples.push(couple);
    else couples[index] = couple;
    this.write(couples);
  }

  private read(): Couple[] {
    if (!existsSync(this.filePath)) return [];
    return JSON.parse(readFileSync(this.filePath, "utf8")) as Couple[];
  }

  private write(couples: Couple[]): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(couples, null, 2));
    renameSync(tmp, this.filePath);
  }
}
