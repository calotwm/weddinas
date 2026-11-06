import { isPresented, type Couple, type Proposal } from "./couple";

export interface CoupleNotification {
  id: string;
  kind: "proposal" | "report";
  title: string;
  body: string;
  /** ISO time it reached the couple. */
  at: string;
  attachments?: Proposal["attachments"];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_FOR_DAYS = 7;

/** When a proposal reached the couple: proposals published before drafts existed fall back to their creation time. */
export const presentedAt = (p: Proposal) => p.presentedAt ?? p.createdAt;

/** What the team shared with the couple, newest first: presented proposals and reports. */
export function coupleNotifications(couple: Pick<Couple, "proposals" | "reports">): CoupleNotification[] {
  const proposals = couple.proposals.filter(isPresented).map(
    (p): CoupleNotification => ({ id: p.id, kind: "proposal", title: p.title, body: p.description, at: presentedAt(p) }),
  );
  const reports = couple.reports.map(
    (r): CoupleNotification => ({ id: r.id, kind: "report", title: r.title, body: r.body, at: r.createdAt, attachments: r.attachments }),
  );
  return [...proposals, ...reports].sort((a, b) => b.at.localeCompare(a.at));
}

export const unreadCount = (notes: CoupleNotification[], seenAt: string | null | undefined) =>
  notes.filter((n) => !seenAt || n.at > seenAt).length;

export const daysAgo = (iso: string, now = new Date()) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));

/** A pending proposal presented in the last week gets the "Nuevo" badge. */
export const isNewProposal = (p: Proposal, now = new Date()) =>
  isPresented(p) && p.status === "pending" && daysAgo(presentedAt(p), now) < NEW_FOR_DAYS;
