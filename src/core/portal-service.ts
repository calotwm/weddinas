import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { matchGuest, plain, type RsvpAnswer } from "./rsvp";
import { accessCodeFor, hashAccessCode } from "./access-code";
import type { ComparisonTable } from "./comparison-table";
import { byDayTime } from "./timing";
import { normalizeWhatsapp } from "./whatsapp";
import { cleanWebSelection, webDressCode } from "./web-options";
import type { AestheticWeb } from "./couple";
import { tracksConfirmedGuests } from "./budget";
import { BRIEF_CATALOG, catalogBlock, categoryName, CUSTOM_BLOCK_NAME_MAX, CUSTOM_BLOCK_PREFIX, defaultBrief, defaultMusic, musicMomentKeys, newBriefBlock, newCustomBriefBlock, SONG_MOMENT_KEYS, withCatalogFields } from "./brief-catalog";
import {
  emptyPublicInfo,
  isLineState,
  isPresented,
  type Attachment,
  type BlockStatus,
  type BriefBlock,
  type BriefField,
  type BudgetItem,
  type ChecklistTask,
  type CommentAuthor,
  type Couple,
  type CoupleSection,
  type CoupleView,
  type FamilyMember,
  type FamilySide,
  type Guest,
  type GuestStatus,
  type Music,
  type PaletteColor,
  type Payment,
  type PaymentKind,
  type Proposal,
  type ProposalComment,
  type ProposalStatus,
  type PublicInfo,
  type PublicPage,
  type Report,
  type SongStatus,
  type TimingItem,
  type VendorTimingItem,
} from "./couple";
import { GUEST_AGES, GUEST_STATUSES, MAX_GUESTS } from "./guests";
import type { CoupleRepository } from "./ports";
import { slugify } from "./slug";
import { isFileId } from "./uploads";

export interface NewCoupleInput {
  partnerA: string;
  partnerB: string;
  weddingDate: string;
}

export type BudgetItemInput = Omit<BudgetItem, "id" | "payments" | "dueDate"> & { dueDate?: string };
export type PaymentInput = Omit<Payment, "id">;
export interface BriefBlockUpdate {
  vendor: string;
  contact: string;
  status: BlockStatus;
  owner: string;
  fields: BriefField[];
}

export interface AestheticInput {
  fonts: string;
  /** Stored on the public info, where the guest page already reads it. */
  dressCode: string;
  palette: PaletteColor[];
}

export interface AestheticGeneralInput {
  titleFont: string;
  bodyFont: string;
  ideas: string;
  palette: PaletteColor[];
}

export type TimingInput = Omit<TimingItem, "id">;
export type VendorTimingInput = Omit<VendorTimingItem, "id">;
export type GuestInput = Omit<Guest, "id">;
export type NewGuestInput = Pick<Guest, "name"> & Partial<Omit<Guest, "id" | "name">>;

export const MAX_AESTHETIC_PHOTOS = 12;
const MAX_PALETTE = 24;
const MAX_TIMING = 100;
const HEX = /^#[0-9a-f]{6}$/i;
const MAX_FONT_TEXT = 1000;
const MAX_IDEAS_TEXT = 4000;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function cleanTiming(input: TimingInput): TimingInput {
  if (!HHMM.test(input.time)) throw new Error("Time must be HH:MM");
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  return { time: input.time, title, note: input.note.trim() };
}

function cleanVendorTiming(input: VendorTimingInput): VendorTimingInput {
  if (!HHMM.test(input.time)) throw new Error("Time must be HH:MM");
  const category = input.category.trim();
  if (!category) throw new Error("Rubro is required");
  return { time: input.time, category, company: input.company.trim(), contact: input.contact.trim() };
}

function cleanGuest(input: NewGuestInput): GuestInput {
  const status: GuestStatus = input.status ?? "pending";
  if (!GUEST_STATUSES.includes(status)) throw new Error("Unknown guest status");
  if (input.age !== undefined && !GUEST_AGES.includes(input.age)) throw new Error("Unknown guest age");
  const guest: GuestInput = {
    name: input.name.trim(),
    group: (input.group ?? "").trim(),
    status,
    table: (input.table ?? "").trim(),
    restriction: (input.restriction ?? "").trim(),
  };
  // Optional fields are stored only when set, so older guests and blank answers stay as they were.
  for (const key of ["lastName", "side", "transport", "phone"] as const) {
    const value = (input[key] ?? "").trim();
    if (value) guest[key] = value;
  }
  if (input.age) guest.age = input.age;
  if (typeof input.travels === "boolean") guest.travels = input.travels;
  return guest;
}

/** Cleans new guests and gives them ids; blank names are skipped. */
function newGuests(inputs: NewGuestInput[]): Guest[] {
  return inputs
    .map(cleanGuest)
    .filter((g) => g.name)
    .map((g) => ({ id: randomUUID(), ...g }));
}


export type AttachmentTarget = { kind: "brief"; key: string } | { kind: "proposal"; id: string } | { kind: "report"; id: string };

/** Keeps the last path segment and drops characters that could break markup or headers. */
function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  return base.replace(/[<>:"|?*\u0000-\u001f]/g, "").trim().slice(0, 120) || "archivo";
}

function attachmentsOf(couple: Couple, target: AttachmentTarget): Attachment[] {
  const owner =
    target.kind === "brief"
      ? couple.brief.find((b) => b.key === target.key)
      : target.kind === "proposal"
        ? couple.proposals.find((p) => p.id === target.id)
        : couple.reports.find((r) => r.id === target.id);
  if (!owner) throw new Error(`${target.kind} not found`);
  return (owner.attachments ??= []);
}

const BLOCK_STATUSES: BlockStatus[] = ["searching", "deciding", "confirmed", "na"];
const SONG_STATUSES: SongStatus[] = ["chosen", "pending", "na"];
const PAYMENT_KINDS: PaymentKind[] = ["sena", "saldo", "adicional", "iva", "intermedio"];
const BRIEF_ORDER = BRIEF_CATALOG.map((b) => b.key);
const COMMENT_AUTHORS: CommentAuthor[] = ["couple", "team"];

/** Adds the catalog block when the couple does not have it yet, keeping catalog order; returns the couple's block. */
function ensureBriefBlock(couple: Couple, key: string): BriefBlock {
  const entry = catalogBlock(key);
  let block = couple.brief.find((b) => b.key === key);
  if (!entry && !block && !key.startsWith(CUSTOM_BLOCK_PREFIX)) throw new Error("Unknown brief block");
  if (!block) {
    // A custom rubro removed after a proposal used it comes back under the name its key reads as.
    block = entry ? newBriefBlock(entry) : { ...newCustomBriefBlock(categoryName(key)), key };
    couple.brief.push(block);
    sortBrief(couple.brief);
  }
  return block;
}

/** Catalog order; custom rubros (outside the catalog) go last, in the order they were added. */
function sortBrief(brief: BriefBlock[]) {
  const rank = (key: string) => (BRIEF_ORDER.includes(key) ? BRIEF_ORDER.indexOf(key) : BRIEF_ORDER.length);
  brief.sort((a, b) => rank(a.key) - rank(b.key));
}

/** Stamps the moment a block becomes confirmed (the couple's vendor notification) and clears it when it leaves that status. */
function setBlockStatus(block: BriefBlock, status: BlockStatus) {
  if (status !== "confirmed") block.confirmedAt = null;
  else if (block.status !== "confirmed" || !block.confirmedAt) block.confirmedAt = new Date().toISOString();
  block.status = status;
}

/** An optional vendor rubro of the brief catalog or one of the couple's custom rubros; empty means "Sin rubro". */
function proposalCategory(category: string | undefined, brief: BriefBlock[]): string | undefined {
  const key = category?.trim();
  if (!key) return undefined;
  const kind = catalogBlock(key)?.kind ?? brief.find((b) => b.key === key)?.kind;
  if (kind !== "vendor") throw new Error("Unknown proposal category");
  return key;
}
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type LoadedCouple = Couple & Required<Pick<Couple, CoupleSection>>;

/** Fills planner fields missing on couples stored before they existed. */
function withPlannerDefaults(couple: Couple): LoadedCouple {
  couple.budget ??= { usdQuote: "blue", guests: null, items: [] };
  couple.brief ??= defaultBrief();
  couple.ideas ??= "";
  couple.music ??= defaultMusic();
  couple.music.customMoments ??= [];
  couple.music.hiddenMoments ??= [];
  couple.family ??= [];
  for (const member of couple.family) member.notes ??= "";
  couple.aesthetic ??= { fonts: "", palette: [], photoIds: [] };
  couple.aesthetic.titleFont ??= "";
  couple.aesthetic.bodyFont ??= "";
  couple.aesthetic.ideas ??= "";
  couple.aesthetic.web ??= { option: null, choices: {} };
  couple.timing ??= [];
  couple.vendorTiming ??= [];
  couple.guests ??= [];
  couple.rsvpInbox ??= [];
  couple.brief.forEach(withCatalogFields);
  return couple as LoadedCouple;
}

/** A budget rubro is a catalog rubro or one of the couple's custom vendor rubros; an item keeps its own rubro even after that rubro leaves the brief. */
function checkBudgetCategory(category: string, brief: BriefBlock[], current?: string): void {
  if (category === current || catalogBlock(category)) return;
  if (brief.find((b) => b.key === category)?.kind !== "vendor") throw new Error("Unknown category");
}

function cleanBudgetItem(input: BudgetItemInput): BudgetItemInput {
  if (!(input.amount > 0) || !Number.isFinite(input.amount)) throw new Error("Amount must be positive");
  if (input.currency !== "ARS" && input.currency !== "USD") throw new Error("Unknown currency");
  if (input.adjustment !== "ipc" && input.adjustment !== "frozen") throw new Error("Unknown adjustment");
  if (!MONTH.test(input.baseMonth)) throw new Error("Base month must be YYYY-MM");
  const dueDate = input.dueDate?.trim() ?? "";
  if (dueDate && !DAY.test(dueDate)) throw new Error("Due date must be YYYY-MM-DD");
  if (input.freight !== undefined && input.freight !== "yes" && input.freight !== "no") throw new Error("Unknown freight value");
  const { confirmedGuests } = input;
  if (confirmedGuests !== undefined) {
    if (!Number.isInteger(confirmedGuests) || confirmedGuests <= 0) throw new Error("Confirmed guests must be a positive whole number");
    if (!tracksConfirmedGuests(input.category)) throw new Error("Confirmed guests only apply to Espacio, Catering, Barra and Ambientación");
  }
  return {
    category: input.category,
    vendor: input.vendor.trim(),
    concept: input.concept.trim(),
    amount: input.amount,
    currency: input.currency,
    adjustment: input.currency === "USD" ? "frozen" : input.adjustment,
    baseMonth: input.baseMonth,
    note: input.note.trim(),
    dueDate,
    freight: input.freight,
    confirmedGuests,
  };
}

/** A receipt must be one of the couple's uploaded images or PDFs (never a spreadsheet or a path). */
function checkReceiptId(receiptId: string | undefined) {
  if (receiptId !== undefined && (!isFileId(receiptId) || receiptId.endsWith(".xlsx"))) throw new Error("Invalid receipt file");
}

const MAX_RSVP_INBOX = 1000;

function sameSecret(given: string, stored: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** "Sí" confirms, "No" declines, no answer keeps the status; the menu replaces the restriction ("Sin restricciones" clears it). */
function applyRsvp(guest: Guest, answer: Pick<RsvpAnswer, "attending" | "menu">) {
  if (answer.attending !== null) guest.status = answer.attending ? "confirmed" : "declined";
  if (answer.menu) guest.restriction = plain(answer.menu).startsWith("sin restric") ? "" : answer.menu;
}

function toView(couple: Couple): CoupleView {
  const view: Partial<Couple> = { ...withPlannerDefaults(couple) };
  delete view.accessCodeHash;
  delete view.rsvpToken;
  return view as CoupleView;
}

export class PortalService {
  constructor(private readonly repo: CoupleRepository) {}

  async listCouples(): Promise<CoupleView[]> {
    const couples = await this.repo.list();
    return couples.map(toView).sort((a, b) => a.weddingDate.localeCompare(b.weddingDate));
  }

  async getCouple(id: string): Promise<CoupleView | null> {
    const couple = await this.repo.findById(id);
    return couple ? toView(couple) : null;
  }

  async getPublicPage(slug: string): Promise<PublicPage | null> {
    const couple = await this.repo.findBySlug(slug);
    if (!couple) return null;
    const { partnerA, partnerB, weddingDate, publicInfo } = couple;
    return { slug, partnerA, partnerB, weddingDate, publicInfo: { ...emptyPublicInfo(), ...publicInfo } };
  }

  async login(code: string): Promise<CoupleView | null> {
    const couple = await this.repo.findByAccessCodeHash(hashAccessCode(code));
    return couple ? toView(couple) : null;
  }

  /** Returns the plain access code once; only its hash is stored. */
  async createCouple(input: NewCoupleInput): Promise<{ couple: CoupleView; accessCode: string }> {
    return this.serialize(() => this.insertCouple(input));
  }

  private async insertCouple(input: NewCoupleInput): Promise<{ couple: CoupleView; accessCode: string }> {
    const accessCode = await this.uniqueAccessCode(input);
    const couple: Couple = {
      id: randomUUID(),
      slug: await this.uniqueSlug(`${input.partnerA} & ${input.partnerB}`),
      partnerA: input.partnerA.trim(),
      partnerB: input.partnerB.trim(),
      weddingDate: input.weddingDate,
      accessCodeHash: hashAccessCode(accessCode),
      publicInfo: emptyPublicInfo(),
      proposals: [],
      reports: [],
      tasks: [],
      budget: { usdQuote: "blue", guests: null, items: [] },
      brief: defaultBrief(),
      ideas: "",
      music: defaultMusic(),
      family: [],
      aesthetic: { fonts: "", palette: [], photoIds: [] },
      timing: [],
      vendorTiming: [],
      guests: [],
      createdAt: new Date().toISOString(),
    };
    await this.repo.save(couple);
    return { couple: toView(couple), accessCode };
  }

  /** The current code counts as taken, so the new one always differs and the old one stops working. */
  async regenerateCode(coupleId: string): Promise<string> {
    return this.serialize(async () => {
      const couple = await this.repo.findById(coupleId);
      if (!couple) throw new Error("Couple not found");
      const accessCode = await this.uniqueAccessCode(couple);
      couple.accessCodeHash = hashAccessCode(accessCode);
      await this.repo.save(withPlannerDefaults(couple));
      return accessCode;
    });
  }

  /** `whatsapp` is normalized ("11 2233-4455" -> "5491122334455"); "" clears it; an invalid number changes nothing. */
  async updateCoupleDetails(coupleId: string, details: Partial<NewCoupleInput> & { whatsapp?: string }): Promise<void> {
    const whatsapp = details.whatsapp === undefined ? undefined : normalizeWhatsapp(details.whatsapp);
    await this.mutate(coupleId, (c) => {
      if (whatsapp !== undefined) {
        if (whatsapp) c.whatsapp = whatsapp;
        else delete c.whatsapp;
      }
      if (details.partnerA) c.partnerA = details.partnerA.trim();
      if (details.partnerB) c.partnerB = details.partnerB.trim();
      if (details.weddingDate) c.weddingDate = details.weddingDate;
    });
  }

  async updatePublicInfo(coupleId: string, info: Partial<PublicInfo>): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.publicInfo = { ...c.publicInfo, ...info };
    });
  }

  async addProposal(
    coupleId: string,
    input: { title: string; description: string; link?: string; amount?: string; category?: string },
    { present = true }: { present?: boolean } = {},
  ): Promise<Proposal> {
    const createdAt = new Date().toISOString();
    const proposal: Proposal = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      link: input.link ?? "",
      amount: input.amount ?? "",
      status: "pending",
      coupleComment: "",
      createdAt,
      respondedAt: null,
      presentedAt: present ? createdAt : null,
    };
    await this.mutate(coupleId, (c) => {
      const category = proposalCategory(input.category, c.brief);
      if (category) proposal.category = category;
      c.proposals.unshift(proposal);
    });
    return proposal;
  }

  /** The team's edit of a proposal's content, on any status; validated like adding one. */
  async updateProposal(
    coupleId: string,
    proposalId: string,
    input: { title: string; description: string; link: string; amount: string; category: string },
  ): Promise<void> {
    const title = input.title.trim();
    if (!title) throw new Error("Title is required");
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal) throw new Error("Proposal not found");
      // An unchanged rubro stays even if its custom brief block was removed since.
      const category = input.category.trim() === proposal.category ? proposal.category : proposalCategory(input.category, c.brief);
      proposal.title = title;
      proposal.description = input.description.trim();
      proposal.link = input.link.trim();
      proposal.amount = input.amount.trim();
      if (category) proposal.category = category;
      else delete proposal.category;
    });
  }

  async respondToProposal(coupleId: string, proposalId: string, status: ProposalStatus, comment: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal || !isPresented(proposal) || proposal.status === "discarded") throw new Error("Proposal not found");
      if (status !== "approved" && status !== "rejected") throw new Error("Unknown answer");
      proposal.status = status;
      proposal.coupleComment = comment;
      proposal.respondedAt = new Date().toISOString();
      if (status !== "approved" || !proposal.category) return;
      // The chosen proposal wins its rubro: the other open ones go away and the brief block gets confirmed.
      for (const other of c.proposals) {
        if (other !== proposal && other.category === proposal.category && isPresented(other) && other.status === "pending") {
          other.status = "discarded";
        }
      }
      const block = ensureBriefBlock(c, proposal.category);
      // A vendor the team already wrote in the brief is more precise than the proposal title, so it is kept.
      if (!block.vendor) block.vendor = proposal.title;
      setBlockStatus(block, "confirmed");
    });
  }

  /** The couple's shortlist ("Finalista"): reversible and independent of the answer; drafts and discarded ones refuse it. */
  async setProposalFinalist(coupleId: string, proposalId: string, finalist: boolean): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal || !isPresented(proposal) || proposal.status === "discarded") throw new Error("Proposal not found");
      proposal.finalist = finalist;
    });
  }

  async addProposalComment(coupleId: string, proposalId: string, author: CommentAuthor, text: string): Promise<ProposalComment> {
    if (!COMMENT_AUTHORS.includes(author)) throw new Error("Unknown comment author");
    const body = text.trim();
    if (!body) throw new Error("Comment is empty");
    const comment: ProposalComment = { id: randomUUID(), author, text: body, at: new Date().toISOString() };
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal || !isPresented(proposal)) throw new Error("Proposal not found");
      (proposal.comments ??= []).push(comment);
    });
    return comment;
  }

  /** Called when the couple opens Propuestas: stamps every presented proposal they had not seen yet. */
  async markProposalsViewed(coupleId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.mutate(coupleId, (c) => {
      for (const p of c.proposals) if (isPresented(p) && p.status !== "discarded" && !p.viewedAt) p.viewedAt = now;
    });
  }

  async presentProposal(coupleId: string, proposalId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal) throw new Error("Proposal not found");
      proposal.presentedAt ??= new Date().toISOString();
    });
  }

  /**
   * Sets or (with null) removes the comparison table shown inside a proposal. `file` is the stored original,
   * attached to the proposal for the team only. Returns the previous original's file id to delete, if still attached.
   */
  async setProposalComparison(
    coupleId: string,
    proposalId: string,
    table: ComparisonTable | null,
    file?: { id: string; name: string; size: number },
  ): Promise<string | null> {
    let removed: string | null = null;
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal) throw new Error("Proposal not found");
      const attachments = (proposal.attachments ??= []);
      const previous = attachments.findIndex((a) => a.id === proposal.comparison?.attachmentId);
      if (previous >= 0) removed = attachments.splice(previous, 1)[0].id;
      if (!table) {
        delete proposal.comparison;
        return;
      }
      proposal.comparison = { ...table };
      delete proposal.comparison.attachmentId;
      if (file) {
        // Unlike the files the team attaches for the couple, the spreadsheet stays internal.
        attachments.push({ id: file.id, name: safeFileName(file.name), size: file.size, uploadedAt: new Date().toISOString(), internal: true });
        proposal.comparison.attachmentId = file.id;
      }
    });
    return removed;
  }

  async markNotificationsSeen(coupleId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.notificationsSeenAt = new Date().toISOString();
    });
  }

  /** Returns the attached files to delete. */
  async deleteProposal(coupleId: string, proposalId: string): Promise<string[]> {
    let removed: string[] = [];
    await this.mutate(coupleId, (c) => {
      removed = (c.proposals.find((p) => p.id === proposalId)?.attachments ?? []).map((a) => a.id);
      c.proposals = c.proposals.filter((p) => p.id !== proposalId);
    });
    return removed;
  }

  async addReport(coupleId: string, input: { title: string; body: string }): Promise<Report> {
    const report: Report = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    await this.mutate(coupleId, (c) => {
      c.reports.unshift(report);
    });
    return report;
  }

  /** Returns the attached files to delete. */
  async deleteReport(coupleId: string, reportId: string): Promise<string[]> {
    let removed: string[] = [];
    await this.mutate(coupleId, (c) => {
      removed = (c.reports.find((r) => r.id === reportId)?.attachments ?? []).map((a) => a.id);
      c.reports = c.reports.filter((r) => r.id !== reportId);
    });
    return removed;
  }

  async addAttachment(coupleId: string, target: AttachmentTarget, input: Omit<Attachment, "uploadedAt">): Promise<Attachment> {
    const attachment: Attachment = {
      id: input.id,
      name: safeFileName(input.name),
      size: input.size,
      uploadedAt: new Date().toISOString(),
      // Proposals and reports are written for the couple; only brief files can stay internal.
      internal: target.kind === "brief" && input.internal,
    };
    await this.mutate(coupleId, (c) => {
      attachmentsOf(c, target).push(attachment);
    });
    return attachment;
  }

  /** Returns the file id to delete, or null when it was not attached there. */
  async removeAttachment(coupleId: string, target: AttachmentTarget, fileId: string): Promise<string | null> {
    let removed: string | null = null;
    await this.mutate(coupleId, (c) => {
      const list = attachmentsOf(c, target);
      const index = list.findIndex((a) => a.id === fileId);
      if (index >= 0) removed = list.splice(index, 1)[0].id;
      if (target.kind === "proposal") {
        const comparison = c.proposals.find((p) => p.id === target.id)?.comparison;
        if (comparison?.attachmentId === fileId) delete comparison.attachmentId;
      }
    });
    return removed;
  }

  /** Returns the previous cover photo id to delete. */
  async setCoverPhoto(coupleId: string, photoId: string | null): Promise<string | null> {
    let previous: string | null = null;
    await this.mutate(coupleId, (c) => {
      previous = c.publicInfo.coverPhotoId ?? null;
      c.publicInfo.coverPhotoId = photoId;
    });
    return previous;
  }

  /** The only file served without a session: the current cover of a public page. */
  async coverPhoto(slug: string): Promise<{ coupleId: string; photoId: string } | null> {
    const couple = await this.repo.findBySlug(slug);
    const photoId = couple?.publicInfo.coverPhotoId;
    return couple && photoId ? { coupleId: couple.id, photoId } : null;
  }

  /** `month` ("YYYY-MM") places the task in the monthly checklist; without it the task has no month. */
  async addTask(coupleId: string, title: string, month?: string): Promise<ChecklistTask> {
    if (month && !MONTH.test(month)) throw new Error("Month must be YYYY-MM");
    const task: ChecklistTask = { id: randomUUID(), title, done: false, ...(month ? { month } : {}) };
    await this.mutate(coupleId, (c) => {
      c.tasks.push(task);
    });
    return task;
  }

  async setTaskMonth(coupleId: string, taskId: string, month: string | null): Promise<void> {
    if (month && !MONTH.test(month)) throw new Error("Month must be YYYY-MM");
    await this.mutate(coupleId, (c) => {
      const task = c.tasks.find((t) => t.id === taskId);
      if (!task) throw new Error("Task not found");
      if (month) task.month = month;
      else delete task.month;
    });
  }

  async toggleTask(coupleId: string, taskId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const task = c.tasks.find((t) => t.id === taskId);
      if (task) task.done = !task.done;
    });
  }

  async deleteTask(coupleId: string, taskId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.tasks = c.tasks.filter((t) => t.id !== taskId);
    });
  }

  async updateBudgetSettings(coupleId: string, settings: { usdQuote: string; guests: number | null }): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.budget.usdQuote = settings.usdQuote;
      c.budget.guests = settings.guests !== null && settings.guests > 0 ? Math.round(settings.guests) : null;
    });
  }

  async addBudgetItem(coupleId: string, input: BudgetItemInput): Promise<BudgetItem> {
    const item: BudgetItem = { id: randomUUID(), ...cleanBudgetItem(input), payments: [] };
    await this.mutate(coupleId, (c) => {
      checkBudgetCategory(item.category, c.brief);
      c.budget.items.push(item);
    });
    return item;
  }

  async updateBudgetItem(coupleId: string, itemId: string, input: BudgetItemInput): Promise<void> {
    const clean = cleanBudgetItem(input);
    await this.mutate(coupleId, (c) => {
      const item = c.budget.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Budget item not found");
      checkBudgetCategory(clean.category, c.brief, item.category);
      // Payments are recorded against the item's currency; switching it would silently drop them from the totals.
      if (clean.currency !== item.currency && item.payments.length > 0) {
        throw new Error("Cannot change the currency of an item with payments");
      }
      Object.assign(item, clean);
    });
  }

  /** Returns the receipt files of the removed payments so the caller can delete them. */
  async deleteBudgetItem(coupleId: string, itemId: string): Promise<string[]> {
    let receipts: string[] = [];
    await this.mutate(coupleId, (c) => {
      const item = c.budget.items.find((i) => i.id === itemId);
      receipts = (item?.payments ?? []).flatMap((p) => (p.receiptId ? [p.receiptId] : []));
      c.budget.items = c.budget.items.filter((i) => i.id !== itemId);
    });
    return receipts;
  }

  async addPayment(coupleId: string, itemId: string, input: PaymentInput): Promise<Payment> {
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) throw new Error("Amount must be positive");
    if (!DAY.test(input.date)) throw new Error("Date must be YYYY-MM-DD");
    if (!PAYMENT_KINDS.includes(input.kind)) throw new Error("Unknown payment kind");
    checkReceiptId(input.receiptId);
    const payment: Payment = { id: randomUUID(), ...input, note: input.note.trim() };
    await this.mutate(coupleId, (c) => {
      const item = c.budget.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Budget item not found");
      if (payment.currency !== item.currency && !(payment.arsPerUsd && payment.arsPerUsd > 0)) {
        throw new Error("A payment in another currency needs its exchange rate");
      }
      if (payment.currency === item.currency) payment.arsPerUsd = null;
      item.payments.push(payment);
      item.payments.sort((a, b) => a.date.localeCompare(b.date));
    });
    return payment;
  }

  /** Returns the removed payment's receipt file, if any, so the caller can delete it. */
  async deletePayment(coupleId: string, itemId: string, paymentId: string): Promise<string | null> {
    let receipt: string | null = null;
    await this.mutate(coupleId, (c) => {
      const item = c.budget.items.find((i) => i.id === itemId);
      if (!item) return;
      receipt = item.payments.find((p) => p.id === paymentId)?.receiptId ?? null;
      item.payments = item.payments.filter((p) => p.id !== paymentId);
    });
    return receipt;
  }

  /** Attaches (or replaces) a payment's receipt; returns the previous receipt file so the caller can delete it. */
  async setPaymentReceipt(coupleId: string, itemId: string, paymentId: string, receiptId: string): Promise<string | null> {
    checkReceiptId(receiptId);
    let previous: string | null = null;
    await this.mutate(coupleId, (c) => {
      const payment = c.budget.items.find((i) => i.id === itemId)?.payments.find((p) => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");
      previous = payment.receiptId ?? null;
      payment.receiptId = receiptId;
    });
    return previous;
  }

  async addBriefBlock(coupleId: string, key: string): Promise<void> {
    if (!catalogBlock(key)) throw new Error("Unknown brief block");
    await this.mutate(coupleId, (c) => {
      ensureBriefBlock(c, key);
    });
  }

  /** Adds a vendor rubro outside the catalog by its name; returns its key. */
  async addCustomBriefBlock(coupleId: string, name: string): Promise<string> {
    const clean = name.trim().replace(/\s+/g, " ");
    const slug = slugify(clean);
    if (!slug) throw new Error("Brief block name is required");
    if (clean.length > CUSTOM_BLOCK_NAME_MAX) throw new Error("Brief block name is too long");
    if (BRIEF_CATALOG.some((b) => b.key === slug || slugify(b.name) === slug)) throw new Error("Brief block is in the catalog");
    const block = newCustomBriefBlock(clean);
    await this.mutate(coupleId, (c) => {
      if (c.brief.some((b) => b.key === block.key || slugify(b.name) === slug)) throw new Error("Brief block already exists");
      c.brief.push(block);
      sortBrief(c.brief);
    });
    return block.key;
  }

  async updateBriefBlock(coupleId: string, key: string, update: BriefBlockUpdate): Promise<void> {
    if (!BLOCK_STATUSES.includes(update.status)) throw new Error("Unknown status");
    await this.mutate(coupleId, (c) => {
      const block = c.brief.find((b) => b.key === key);
      if (!block) throw new Error("Brief block not found");
      block.vendor = update.vendor.trim();
      block.contact = update.contact.trim();
      setBlockStatus(block, update.status);
      block.owner = update.owner.trim();
      block.fields = update.fields
        .map((f) => ({ label: f.label.trim(), detail: f.detail.trim(), note: f.note.trim(), ...(isLineState(f.state) && { state: f.state }) }))
        .filter((f) => f.label);
    });
  }

  /** Returns the attached files to delete. */
  async removeBriefBlock(coupleId: string, key: string): Promise<string[]> {
    let removed: string[] = [];
    await this.mutate(coupleId, (c) => {
      removed = (c.brief.find((b) => b.key === key)?.attachments ?? []).map((a) => a.id);
      c.brief = c.brief.filter((b) => b.key !== key);
    });
    return removed;
  }

  async updateIdeas(coupleId: string, ideas: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.ideas = ideas.trim();
    });
  }

  /** Keeps only songs of the current moments, so a save racing a removal cannot bring a removed moment back. */
  async saveMusic(coupleId: string, music: Music): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.music = {
        ...c.music,
        songs: musicMomentKeys(c.music).map((moment) => {
          const given = music.songs.find((s) => s.moment === moment);
          return {
            moment,
            song: given?.song.trim() ?? "",
            artist: given?.artist.trim() ?? "",
            status: given && SONG_STATUSES.includes(given.status) ? given.status : "pending",
            note: given?.note.trim() ?? "",
          };
        }),
        playlistUrl: music.playlistUrl.trim(),
        mustPlay: music.mustPlay.trim(),
        banned: music.banned.trim(),
      };
    });
  }

  /** Returns the new moment's key. */
  async addMusicMoment(coupleId: string, input: { label: string; group: string }): Promise<string> {
    const label = input.label.trim();
    const group = input.group.trim();
    if (!label || !group) throw new Error("Moment label and group are required");
    const key = `custom-${randomUUID().slice(0, 8)}`;
    await this.mutate(coupleId, (c) => {
      c.music.customMoments!.push({ key, label, group });
    });
    return key;
  }

  /** Default moments are hidden, custom ones deleted; the moment's song goes with it. */
  async removeMusicMoment(coupleId: string, key: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const music = c.music;
      if (SONG_MOMENT_KEYS.includes(key)) {
        if (!music.hiddenMoments!.includes(key)) music.hiddenMoments!.push(key);
      } else {
        music.customMoments = music.customMoments!.filter((m) => m.key !== key);
      }
      music.songs = music.songs.filter((s) => s.moment !== key);
    });
  }

  async addFamilyMember(coupleId: string, input: { side: FamilySide; name: string; relation: string; notes?: string }): Promise<FamilyMember> {
    if (input.side !== "a" && input.side !== "b") throw new Error("Unknown side");
    if (!input.name.trim()) throw new Error("Name is required");
    const member: FamilyMember = {
      id: randomUUID(),
      side: input.side,
      name: input.name.trim(),
      relation: input.relation.trim(),
      photoId: null,
      notes: (input.notes ?? "").trim(),
    };
    await this.mutate(coupleId, (c) => {
      c.family.push(member);
    });
    return member;
  }

  /** Edits a member's name, relation and "Aclaraciones"; the side and the photo stay. */
  async updateFamilyMember(coupleId: string, memberId: string, input: { name: string; relation: string; notes: string }): Promise<void> {
    const name = input.name.trim();
    if (!name) throw new Error("Name is required");
    await this.mutate(coupleId, (c) => {
      const member = c.family.find((m) => m.id === memberId);
      if (!member) throw new Error("Family member not found");
      member.name = name;
      member.relation = input.relation.trim();
      member.notes = input.notes.trim();
    });
  }

  /** Returns the member's previous photo id so the caller can delete that file. */
  async setFamilyPhoto(coupleId: string, memberId: string, photoId: string | null): Promise<string | null> {
    let previous: string | null = null;
    await this.mutate(coupleId, (c) => {
      const member = c.family.find((m) => m.id === memberId);
      if (!member) throw new Error("Family member not found");
      previous = member.photoId;
      member.photoId = photoId;
    });
    return previous;
  }

  /** Returns the removed member's photo id so the caller can delete that file. */
  async removeFamilyMember(coupleId: string, memberId: string): Promise<string | null> {
    let photoId: string | null = null;
    await this.mutate(coupleId, (c) => {
      photoId = c.family.find((m) => m.id === memberId)?.photoId ?? null;
      c.family = c.family.filter((m) => m.id !== memberId);
    });
    return photoId;
  }

  async saveAesthetic(coupleId: string, input: AestheticInput): Promise<void> {
    const palette = input.palette.slice(0, MAX_PALETTE).map((color) => {
      if (!HEX.test(color.hex)) throw new Error("Each color must be #rrggbb");
      return { name: color.name.trim(), hex: color.hex.toLowerCase() };
    });
    await this.mutate(coupleId, (c) => {
      c.aesthetic.fonts = input.fonts.trim();
      c.aesthetic.palette = palette;
      c.publicInfo.dressCode = input.dressCode.trim();
    });
  }

  /** Estética General; clears the legacy `fonts` text, which the form shows as the title font until saved. */
  async saveAestheticGeneral(coupleId: string, input: AestheticGeneralInput): Promise<void> {
    const palette = input.palette.slice(0, MAX_PALETTE).map((color) => {
      if (!HEX.test(color.hex)) throw new Error("Each color must be #rrggbb");
      return { name: color.name.trim().slice(0, 60), hex: color.hex.toLowerCase() };
    });
    await this.mutate(coupleId, (c) => {
      c.aesthetic.fonts = "";
      c.aesthetic.titleFont = input.titleFont.trim().slice(0, MAX_FONT_TEXT);
      c.aesthetic.bodyFont = input.bodyFont.trim().slice(0, MAX_FONT_TEXT);
      c.aesthetic.ideas = input.ideas.trim().slice(0, MAX_IDEAS_TEXT);
      c.aesthetic.palette = palette;
    });
  }

  /** Estética Web; the dress code choice also becomes the guest page's dress code. */
  async saveAestheticWeb(coupleId: string, input: AestheticWeb): Promise<void> {
    const web = cleanWebSelection(input);
    const dressCode = webDressCode(web);
    await this.mutate(coupleId, (c) => {
      c.aesthetic.web = web;
      if (dressCode !== null) c.publicInfo.dressCode = dressCode;
    });
  }

  async addAestheticPhoto(coupleId: string, photoId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      if (c.aesthetic.photoIds.length >= MAX_AESTHETIC_PHOTOS) throw new Error("Too many photos");
      c.aesthetic.photoIds.push(photoId);
    });
  }

  /** Returns the file id to delete, or null when it was not one of the couple's photos. */
  async removeAestheticPhoto(coupleId: string, photoId: string): Promise<string | null> {
    let removed: string | null = null;
    await this.mutate(coupleId, (c) => {
      if (!c.aesthetic.photoIds.includes(photoId)) return;
      removed = photoId;
      c.aesthetic.photoIds = c.aesthetic.photoIds.filter((id) => id !== photoId);
    });
    return removed;
  }

  async addTimingItem(coupleId: string, input: TimingInput): Promise<TimingItem> {
    const item: TimingItem = { id: randomUUID(), ...cleanTiming(input) };
    await this.mutate(coupleId, (c) => {
      if (c.timing.length >= MAX_TIMING) throw new Error("Too many timing moments");
      c.timing.push(item);
      c.timing.sort(byDayTime);
    });
    return item;
  }

  async updateTimingItem(coupleId: string, itemId: string, input: TimingInput): Promise<void> {
    const clean = cleanTiming(input);
    await this.mutate(coupleId, (c) => {
      const item = c.timing.find((t) => t.id === itemId);
      if (!item) throw new Error("Timing moment not found");
      Object.assign(item, clean);
      c.timing.sort(byDayTime);
    });
  }

  async deleteTimingItem(coupleId: string, itemId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.timing = c.timing.filter((t) => t.id !== itemId);
    });
  }

  async addVendorTimingItem(coupleId: string, input: VendorTimingInput): Promise<VendorTimingItem> {
    const item: VendorTimingItem = { id: randomUUID(), ...cleanVendorTiming(input) };
    await this.mutate(coupleId, (c) => {
      if (c.vendorTiming.length >= MAX_TIMING) throw new Error("Too many vendor timing lines");
      c.vendorTiming.push(item);
      c.vendorTiming.sort(byDayTime);
    });
    return item;
  }

  async updateVendorTimingItem(coupleId: string, itemId: string, input: VendorTimingInput): Promise<void> {
    const clean = cleanVendorTiming(input);
    await this.mutate(coupleId, (c) => {
      const item = c.vendorTiming.find((t) => t.id === itemId);
      if (!item) throw new Error("Vendor timing line not found");
      Object.assign(item, clean);
      c.vendorTiming.sort(byDayTime);
    });
  }

  async deleteVendorTimingItem(coupleId: string, itemId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.vendorTiming = c.vendorTiming.filter((t) => t.id !== itemId);
    });
  }

  /** Adds one or many guests (pasted lists); blank names are skipped. */
  async addGuests(coupleId: string, inputs: NewGuestInput[]): Promise<Guest[]> {
    const added = newGuests(inputs);
    await this.mutate(coupleId, (c) => {
      if (c.guests.length + added.length > MAX_GUESTS) throw new Error(`A list holds up to ${MAX_GUESTS} guests`);
      c.guests.push(...added);
    });
    return added;
  }

  /** Replaces the whole list (an imported Excel); same cleaning and limit as addGuests. */
  async replaceGuests(coupleId: string, inputs: NewGuestInput[]): Promise<Guest[]> {
    const guests = newGuests(inputs);
    if (guests.length > MAX_GUESTS) throw new Error(`A list holds up to ${MAX_GUESTS} guests`);
    await this.mutate(coupleId, (c) => {
      c.guests = guests;
    });
    return guests;
  }

  async updateGuest(coupleId: string, guestId: string, input: GuestInput): Promise<void> {
    const clean = cleanGuest(input);
    if (!clean.name) throw new Error("Name is required");
    await this.mutate(coupleId, (c) => {
      const index = c.guests.findIndex((g) => g.id === guestId);
      if (index === -1) throw new Error("Guest not found");
      // Replaced rather than merged, so cleared optional fields go away; the fields the row form does not carry
      // (travels without an answer, the team's attendance tick) keep their stored value.
      const { travels, arrived } = c.guests[index];
      c.guests[index] = {
        id: guestId,
        ...clean,
        ...(clean.travels === undefined && travels !== undefined ? { travels } : {}),
        ...(arrived ? { arrived } : {}),
      };
    });
  }

  /** The team's attendance tick on the day; unticking removes the field. */
  async setGuestArrived(coupleId: string, guestId: string, arrived: boolean): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const guest = c.guests.find((g) => g.id === guestId);
      if (!guest) throw new Error("Guest not found");
      if (arrived) guest.arrived = true;
      else delete guest.arrived;
    });
  }

  async deleteGuest(coupleId: string, guestId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.guests = c.guests.filter((g) => g.id !== guestId);
    });
  }

  /** The secret for the invitation form's webhook URL, created on first use. */
  async rsvpToken(coupleId: string): Promise<string> {
    let token = "";
    await this.mutate(coupleId, (c) => {
      c.rsvpToken ??= randomBytes(24).toString("hex");
      token = c.rsvpToken;
    });
    return token;
  }

  /** The current webhook secret, or null before the team created one (read-only). */
  async currentRsvpToken(coupleId: string): Promise<string | null> {
    return (await this.repo.findById(coupleId))?.rsvpToken ?? null;
  }

  /** Whether the webhook URL's secret is this couple's current one (false for unknown couples). */
  async isRsvpToken(coupleId: string, token: string): Promise<boolean> {
    const stored = (await this.repo.findById(coupleId))?.rsvpToken;
    return !!stored && sameSecret(token, stored);
  }

  /** A new secret: the old webhook URL stops working. */
  async rotateRsvpToken(coupleId: string): Promise<string> {
    const token = randomBytes(24).toString("hex");
    await this.mutate(coupleId, (c) => {
      c.rsvpToken = token;
    });
    return token;
  }

  /** Logs an answer from the invitation web and applies it to the guest it names, when exactly one matches. */
  async receiveRsvp(coupleId: string, token: string, answer: RsvpAnswer): Promise<"matched" | "unmatched"> {
    let result: "matched" | "unmatched" = "unmatched";
    await this.mutate(coupleId, (c) => {
      if (!c.rsvpToken || !sameSecret(token, c.rsvpToken)) throw new Error("Invalid RSVP token");
      const guest = matchGuest(c.guests, answer.name);
      if (guest) applyRsvp(guest, answer);
      result = guest ? "matched" : "unmatched";
      c.rsvpInbox.push({ id: randomUUID(), receivedAt: new Date().toISOString(), ...answer, guestId: guest?.id ?? null });
      if (c.rsvpInbox.length > MAX_RSVP_INBOX) c.rsvpInbox.splice(0, c.rsvpInbox.length - MAX_RSVP_INBOX);
    });
    return result;
  }

  /** Applies a logged answer to the guest the team or the couple picked. */
  async assignRsvp(coupleId: string, entryId: string, guestId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const entry = c.rsvpInbox.find((e) => e.id === entryId);
      if (!entry) throw new Error("Answer not found");
      const guest = c.guests.find((g) => g.id === guestId);
      if (!guest) throw new Error("Guest not found");
      applyRsvp(guest, entry);
      entry.guestId = guest.id;
    });
  }

  async dismissRsvp(coupleId: string, entryId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.rsvpInbox = c.rsvpInbox.filter((e) => e.id !== entryId);
    });
  }

  /** Changes whenever the access code changes; sessions are bound to it so regenerating a code logs old devices out. */
  async credentialFingerprint(coupleId: string): Promise<string | null> {
    return (await this.repo.findById(coupleId))?.accessCodeHash ?? null;
  }

  /** Serializes writes so concurrent read-modify-write cycles never overwrite each other. */
  private writes: Promise<unknown> = Promise.resolve();

  private serialize<T>(work: () => Promise<T>): Promise<T> {
    const run = this.writes.then(work, work);
    this.writes = run.catch(() => undefined);
    return run;
  }

  private mutate(coupleId: string, change: (couple: LoadedCouple) => void): Promise<void> {
    return this.serialize(async () => {
      const couple = await this.repo.findById(coupleId);
      if (!couple) throw new Error("Couple not found");
      change(withPlannerDefaults(couple));
      await this.repo.save(couple);
    });
  }

  private async uniqueSlug(names: string): Promise<string> {
    const base = slugify(names) || "pareja";
    let slug = base;
    for (let n = 2; await this.repo.findBySlug(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  /** Easy code for the couple; when taken (by another couple or the current code) appends 2, 3… */
  private async uniqueAccessCode(names: Pick<Couple, "partnerA" | "partnerB" | "weddingDate">): Promise<string> {
    const base = accessCodeFor(names.partnerA, names.partnerB, names.weddingDate);
    let code = base;
    for (let n = 2; await this.repo.findByAccessCodeHash(hashAccessCode(code)); n++) code = `${base}${n}`;
    return code;
  }
}
