import type { Couple } from "./couple";

export interface CoupleRepository {
  list(): Promise<Couple[]>;
  findById(id: string): Promise<Couple | null>;
  findBySlug(slug: string): Promise<Couple | null>;
  findByAccessCodeHash(hash: string): Promise<Couple | null>;
  save(couple: Couple): Promise<void>;
}
