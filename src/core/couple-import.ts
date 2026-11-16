import { catalogBlock } from "./brief-catalog";
import { plain } from "./rsvp";
import type { Couple, CoupleView, FamilySide, Music } from "./couple";
import type { CoupleRepository } from "./ports";
import {
  PortalService,
  type BriefBlockUpdate,
  type BudgetItemInput,
  type NewGuestInput,
  type PaymentInput,
  type TimingInput,
  type VendorTimingInput,
} from "./portal-service";

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
  /** Vendor rubros outside the catalog, created by name first; the brief and the budget refer to them by `customBlockKey(name)`. */
  customRubros?: string[];
  brief?: Array<BriefBlockUpdate & { key: string }>;
  guests?: NewGuestInput[];
  timing?: TimingInput[];
  vendorTiming?: VendorTimingInput[];
  /** `customMoments` keys only link the file's songs to its moments; the app gives each moment a new key. */
  music?: Music;
  family?: Array<{ side: FamilySide; name: string; relation: string; notes?: string }>;
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
  async delete(id: string) {
    this.couples = this.couples.filter((c) => c.id !== id);
  }
}

async function apply(service: PortalService, data: CoupleImport): Promise<{ coupleId: string; accessCode: string }> {
  if (!data.partnerA?.trim() || !data.partnerB?.trim()) throw new Error("Both partner names are required");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data.weddingDate ?? "")) throw new Error("weddingDate must be YYYY-MM-DDTHH:mm");

  const { couple, accessCode } = await service.createCouple(data);
  const id = couple.id;
  if (data.venue) await service.updatePublicInfo(id, { venue: data.venue.trim() });
  if (data.ideas) await service.updateIdeas(id, data.ideas);
  for (const name of data.customRubros ?? []) await service.addCustomBriefBlock(id, name);
  for (const block of data.brief ?? []) {
    if (catalogBlock(block.key)) await service.addBriefBlock(id, block.key);
    await service.updateBriefBlock(id, block.key, block);
  }
  if (data.budget) {
    await service.updateBudgetSettings(id, { usdQuote: data.budget.usdQuote ?? "blue", guests: data.budget.guests ?? null });
    for (const { payments, ...input } of data.budget.items) {
      const item = await service.addBudgetItem(id, input);
      for (const payment of payments ?? []) await service.addPayment(id, item.id, payment);
    }
  }
  if (data.guests?.length) await service.replaceGuests(id, data.guests);
  for (const item of data.timing ?? []) await service.addTimingItem(id, item);
  for (const item of data.vendorTiming ?? []) await service.addVendorTimingItem(id, item);
  if (data.music) {
    const keys = new Map<string, string>();
    for (const moment of data.music.customMoments ?? []) keys.set(moment.key, await service.addMusicMoment(id, moment));
    await service.saveMusic(id, { ...data.music, songs: data.music.songs.map((s) => ({ ...s, moment: keys.get(s.moment) ?? s.moment })) });
  }
  for (const member of data.family ?? []) await service.addFamilyMember(id, member);
  return { coupleId: id, accessCode };
}

/** Runs the import on an in-memory repository and returns the couple it would create; throws like the real import. */
export async function rehearseCoupleImport(data: CoupleImport): Promise<CoupleView> {
  const scratch = new PortalService(new ScratchRepository());
  const { coupleId } = await apply(scratch, data);
  return (await scratch.getCouple(coupleId))!;
}

/**
 * Updates an existing couple from a newer import file: the file is rehearsed as a new couple, then its sections
 * replace the couple's (see PortalService.replaceSheetData). Sections the file leaves out stay as they are;
 * an invalid file changes nothing.
 */
export async function refreshCoupleFromImport(service: PortalService, coupleId: string, data: CoupleImport): Promise<void> {
  const couple = await service.getCouple(coupleId);
  if (!couple) throw new Error("Couple not found");
  const names = (a: string, b: string) => [plain(a), plain(b)].sort().join("|");
  if (names(couple.partnerA, couple.partnerB) !== names(data.partnerA ?? "", data.partnerB ?? "")) {
    throw new Error("The file is for another couple");
  }
  const fresh = await rehearseCoupleImport(data);
  const has = (value: unknown) => value !== undefined;
  await service.replaceSheetData(coupleId, {
    weddingDate: fresh.weddingDate,
    venue: data.venue?.trim() || undefined,
    ideas: has(data.ideas) ? fresh.ideas : undefined,
    brief: has(data.brief) || has(data.customRubros) ? fresh.brief : undefined,
    budget: has(data.budget) ? fresh.budget : undefined,
    music: has(data.music) ? fresh.music : undefined,
    family: has(data.family) ? fresh.family : undefined,
    // Like the import, an empty list counts as missing (a sheet with only placeholder rows).
    guests: data.guests?.length ? fresh.guests : undefined,
    timing: has(data.timing) ? fresh.timing : undefined,
    vendorTiming: has(data.vendorTiming) ? fresh.vendorTiming : undefined,
  });
}

/** Rehearses the import on a scratch repository first, so an invalid file never leaves a half-imported couple. */
export async function importCouple(service: PortalService, data: CoupleImport): Promise<{ coupleId: string; accessCode: string }> {
  await rehearseCoupleImport(data);
  return apply(service, data);
}
