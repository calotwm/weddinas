import { randomUUID } from "node:crypto";
import { generateAccessCode, hashAccessCode } from "./access-code";
import {
  emptyPublicInfo,
  type ChecklistTask,
  type Couple,
  type CoupleView,
  type Proposal,
  type ProposalStatus,
  type PublicInfo,
  type PublicPage,
  type Report,
} from "./couple";
import type { CoupleRepository } from "./ports";
import { slugify } from "./slug";

export interface NewCoupleInput {
  partnerA: string;
  partnerB: string;
  weddingDate: string;
}

function toView(couple: Couple): CoupleView {
  const view: Partial<Couple> = { ...couple };
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
    return { slug, partnerA, partnerB, weddingDate, publicInfo };
  }

  async login(code: string): Promise<CoupleView | null> {
    const couple = await this.repo.findByAccessCodeHash(hashAccessCode(code));
    return couple ? toView(couple) : null;
  }

  /** Returns the plain access code once; only its hash is stored. */
  async createCouple(input: NewCoupleInput): Promise<{ couple: CoupleView; accessCode: string }> {
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

  async deleteProposal(coupleId: string, proposalId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.proposals = c.proposals.filter((p) => p.id !== proposalId);
    });
  }

  async addReport(coupleId: string, input: { title: string; body: string }): Promise<Report> {
    const report: Report = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    await this.mutate(coupleId, (c) => {
      c.reports.unshift(report);
    });
    return report;
  }

  async deleteReport(coupleId: string, reportId: string): Promise<void> {
    await this.mutate(coupleId, (c) => {
      c.reports = c.reports.filter((r) => r.id !== reportId);
    });
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

  private async mutate(coupleId: string, change: (couple: Couple) => void): Promise<void> {
    const couple = await this.repo.findById(coupleId);
    if (!couple) throw new Error("Couple not found");
    change(couple);
    await this.repo.save(couple);
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
