import { randomUUID } from "node:crypto";
import { generateAccessCode, hashAccessCode } from "./access-code";
import { BRIEF_CATALOG, catalogBlock, defaultBrief, defaultMusic, newBriefBlock, SONG_MOMENT_KEYS } from "./brief-catalog";
import {
  emptyPublicInfo,
  type Attachment,
  type BlockStatus,
  type BriefField,
  type BudgetItem,
  type ChecklistTask,
  type Couple,
  type CoupleView,
  type FamilyMember,
  type FamilySide,
  type Music,
  type Payment,
  type PaymentKind,
  type Proposal,
  type ProposalStatus,
  type PublicInfo,
  type PublicPage,
  type Report,
  type SongStatus,
} from "./couple";
import type { CoupleRepository } from "./ports";
import { slugify } from "./slug";

export interface NewCoupleInput {
  partnerA: string;
  partnerB: string;
  weddingDate: string;
}

export type BudgetItemInput = Omit<BudgetItem, "id" | "payments">;
export type PaymentInput = Omit<Payment, "id">;
export interface BriefBlockUpdate {
  vendor: string;
  contact: string;
  status: BlockStatus;
  owner: string;
  fields: BriefField[];
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
const PAYMENT_KINDS: PaymentKind[] = ["sena", "saldo", "adicional", "iva"];
const BRIEF_ORDER = BRIEF_CATALOG.map((b) => b.key);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Fills planner fields missing on couples stored before they existed. */
function withPlannerDefaults(couple: Couple): Couple {
  couple.budget ??= { usdQuote: "blue", guests: null, items: [] };
  couple.brief ??= defaultBrief();
  couple.ideas ??= "";
  couple.music ??= defaultMusic();
  couple.family ??= [];
  return couple;
}

function cleanBudgetItem(input: BudgetItemInput): BudgetItemInput {
  if (!catalogBlock(input.category)) throw new Error("Unknown category");
  if (!(input.amount > 0) || !Number.isFinite(input.amount)) throw new Error("Amount must be positive");
  if (input.currency !== "ARS" && input.currency !== "USD") throw new Error("Unknown currency");
  if (input.adjustment !== "ipc" && input.adjustment !== "frozen") throw new Error("Unknown adjustment");
  if (!MONTH.test(input.baseMonth)) throw new Error("Base month must be YYYY-MM");
  return {
    category: input.category,
    vendor: input.vendor.trim(),
    concept: input.concept.trim(),
    amount: input.amount,
    currency: input.currency,
    adjustment: input.currency === "USD" ? "frozen" : input.adjustment,
    baseMonth: input.baseMonth,
    note: input.note.trim(),
  };
}

function toView(couple: Couple): CoupleView {
  const view: Partial<Couple> = { ...withPlannerDefaults(couple) };
  delete view.accessCodeHash;
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
    const accessCode = await this.uniqueAccessCode();
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
      createdAt: new Date().toISOString(),
    };
    await this.repo.save(couple);
    return { couple: toView(couple), accessCode };
  }

  async regenerateCode(coupleId: string): Promise<string> {
    const accessCode = await this.uniqueAccessCode();
    await this.mutate(coupleId, (c) => {
      c.accessCodeHash = hashAccessCode(accessCode);
    });
    return accessCode;
  }

  async updateCoupleDetails(coupleId: string, details: Partial<NewCoupleInput>): Promise<void> {
    await this.mutate(coupleId, (c) => {
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
    input: { title: string; description: string; link?: string; amount?: string },
  ): Promise<Proposal> {
    const proposal: Proposal = {
      id: randomUUID(),
      title: input.title,
      description: input.description,
      link: input.link ?? "",
      amount: input.amount ?? "",
      status: "pending",
      coupleComment: "",
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };
    await this.mutate(coupleId, (c) => {
      c.proposals.unshift(proposal);
    });
    return proposal;
  }

  async respondToProposal(coupleId: string, proposalId: string, status: ProposalStatus, comment: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const proposal = c.proposals.find((p) => p.id === proposalId);
      if (!proposal) throw new Error("Proposal not found");
      proposal.status = status;
      proposal.coupleComment = comment;
      proposal.respondedAt = new Date().toISOString();
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

  async addTask(coupleId: string, title: string): Promise<ChecklistTask> {
    const task: ChecklistTask = { id: randomUUID(), title, done: false };
    await this.mutate(coupleId, (c) => {
      c.tasks.push(task);
    });
    return task;
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
      c.budget.items.push(item);
    });
    return item;
  }

  async updateBudgetItem(coupleId: string, itemId: string, input: BudgetItemInput): Promise<void> {
    const clean = cleanBudgetItem(input);
    await this.mutate(coupleId, (c) => {
      const item = c.budget.items.find((i) => i.id === itemId);
      if (!item) throw new Error("Budget item not found");
      // Payments are recorded against the item's currency; switching it would silently drop them from the totals.
      if (clean.currency !== item.currency && item.payments.length > 0) {
        throw new Error("Cannot change the currency of an item with payments");
      }
      Object.assign(item, clean);
    });
  }

  async deleteBudgetItem(coupleId: string, itemId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.budget.items = c.budget.items.filter((i) => i.id !== itemId);
    });
  }

  async addPayment(coupleId: string, itemId: string, input: PaymentInput): Promise<Payment> {
    if (!(input.amount > 0) || !Number.isFinite(input.amount)) throw new Error("Amount must be positive");
    if (!DAY.test(input.date)) throw new Error("Date must be YYYY-MM-DD");
    if (!PAYMENT_KINDS.includes(input.kind)) throw new Error("Unknown payment kind");
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

  async deletePayment(coupleId: string, itemId: string, paymentId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      const item = c.budget.items.find((i) => i.id === itemId);
      if (item) item.payments = item.payments.filter((p) => p.id !== paymentId);
    });
  }

  async addBriefBlock(coupleId: string, key: string): Promise<void> {
    const entry = catalogBlock(key);
    if (!entry) throw new Error("Unknown brief block");
    await this.mutate(coupleId, (c) => {
      if (c.brief.some((b) => b.key === key)) return;
      c.brief.push(newBriefBlock(entry));
      c.brief.sort((a, b) => BRIEF_ORDER.indexOf(a.key) - BRIEF_ORDER.indexOf(b.key));
    });
  }

  async updateBriefBlock(coupleId: string, key: string, update: BriefBlockUpdate): Promise<void> {
    if (!BLOCK_STATUSES.includes(update.status)) throw new Error("Unknown status");
    await this.mutate(coupleId, (c) => {
      const block = c.brief.find((b) => b.key === key);
      if (!block) throw new Error("Brief block not found");
      block.vendor = update.vendor.trim();
      block.contact = update.contact.trim();
      block.status = update.status;
      block.owner = update.owner.trim();
      block.fields = update.fields
        .map((f) => ({ label: f.label.trim(), detail: f.detail.trim(), note: f.note.trim() }))
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

  async saveMusic(coupleId: string, music: Music): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.music = {
        songs: SONG_MOMENT_KEYS.map((moment) => {
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

  async addFamilyMember(coupleId: string, input: { side: FamilySide; name: string; relation: string }): Promise<FamilyMember> {
    if (input.side !== "a" && input.side !== "b") throw new Error("Unknown side");
    if (!input.name.trim()) throw new Error("Name is required");
    const member: FamilyMember = { id: randomUUID(), side: input.side, name: input.name.trim(), relation: input.relation.trim(), photoId: null };
    await this.mutate(coupleId, (c) => {
      c.family.push(member);
    });
    return member;
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

  private mutate(coupleId: string, change: (couple: Couple) => void): Promise<void> {
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

  private async uniqueAccessCode(): Promise<string> {
    let code = generateAccessCode();
    while (await this.repo.findByAccessCodeHash(hashAccessCode(code))) code = generateAccessCode();
    return code;
  }
}
