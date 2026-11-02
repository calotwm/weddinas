import type { Couple, FamilySide, Music } from "./couple";
import type { CoupleRepository } from "./ports";
import { PortalService, type BriefBlockUpdate, type BudgetItemInput, type PaymentInput } from "./portal-service";

/** A whole couple moved from the planners' spreadsheets (see README, "Importing couples"). */
export interface CoupleImport {
  partnerA: string;
  partnerB: string;
  weddingDate: string;
  venue?: string;
  ideas?: string;
  budget?: {
    usdQuote?: string;
    guests?: number | null;
    items: Array<BudgetItemInput & { payments?: PaymentInput[] }>;
  };
  brief?: Array<BriefBlockUpdate & { key: string }>;
  music?: Music;
  family?: Array<{ side: FamilySide; name: string; relation: string }>;
}

/** Keeps couples in memory; used to rehearse an import before touching the real repository. */
class ScratchRepository implements CoupleRepository {
  private couples: Couple[] = [];
  async list() {
    return structuredClone(this.couples);
  }
  async findById(id: string) {
    return structuredClone(this.couples.find((c) => c.id === id) ?? null);
  }
  async findBySlug(slug: string) {
    return structuredClone(this.couples.find((c) => c.slug === slug) ?? null);
  }
  async findByAccessCodeHash(hash: string) {
    return structuredClone(this.couples.find((c) => c.accessCodeHash === hash) ?? null);
  }
  async save(couple: Couple) {
    this.couples = [...this.couples.filter((c) => c.id !== couple.id), structuredClone(couple)];
  }
}

async function apply(service: PortalService, data: CoupleImport): Promise<{ coupleId: string; accessCode: string }> {
  if (!data.partnerA?.trim() || !data.partnerB?.trim()) throw new Error("Both partner names are required");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.weddingDate ?? "")) throw new Error("weddingDate must be YYYY-MM-DDTHH:mm");

  const { couple, accessCode } = await service.createCouple(data);
  const id = couple.id;
  if (data.venue) await service.updatePublicInfo(id, { venue: data.venue.trim() });
  if (data.ideas) await service.updateIdeas(id, data.ideas);
  for (const block of data.brief ?? []) {
    await service.addBriefBlock(id, block.key);
    await service.updateBriefBlock(id, block.key, block);
  }
  if (data.budget) {
    await service.updateBudgetSettings(id, { usdQuote: data.budget.usdQuote ?? "blue", guests: data.budget.guests ?? null });
    for (const { payments, ...input } of data.budget.items) {
      const item = await service.addBudgetItem(id, input);
      for (const payment of payments ?? []) await service.addPayment(id, item.id, payment);
    }
  }
  if (data.music) await service.saveMusic(id, data.music);
  for (const member of data.family ?? []) await service.addFamilyMember(id, member);
  return { coupleId: id, accessCode };
}

/** Rehearses the import on a scratch repository first, so an invalid file never leaves a half-imported couple. */
export async function importCouple(service: PortalService, data: CoupleImport): Promise<{ coupleId: string; accessCode: string }> {
  await apply(new PortalService(new ScratchRepository()), data);
  return apply(service, data);
}
