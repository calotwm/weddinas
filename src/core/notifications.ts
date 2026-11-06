import { isPresented, type Couple, type Proposal } from "./couple";

export interface CoupleNotification {
  id: string;
  /** "vendor": a brief vendor became confirmed; "comment": the team answered on a proposal. */
  kind: "proposal" | "report" | "vendor" | "comment";
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

/**
 * What reached the couple, newest first: presented proposals (discarded ones left out), reports,
 * vendors confirmed in the brief and the team's answers on proposals.
 */
export function coupleNotifications(couple: Pick<Couple, "proposals" | "reports"> & Partial<Pick<Couple, "brief">>): CoupleNotification[] {
  const visible = couple.proposals.filter((p) => isPresented(p) && p.status !== "discarded");
  const proposals = visible.map(
    (p): CoupleNotification => ({ id: p.id, kind: "proposal", title: p.title, body: p.description, at: presentedAt(p) }),
  );
  const comments = visible.flatMap((p) =>
    (p.comments ?? [])
      .filter((c) => c.author === "team")
      .map((c): CoupleNotification => ({ id: c.id, kind: "comment", title: `Respuesta sobre "${p.title}"`, body: c.text, at: c.at })),
  );
  const reports = couple.reports.map(
    (r): CoupleNotification => ({ id: r.id, kind: "report", title: r.title, body: r.body, at: r.createdAt, attachments: r.attachments }),
  );
  const vendors = (couple.brief ?? [])
    .filter((b) => b.kind === "vendor" && b.status === "confirmed" && b.confirmedAt)
    .map(
      (b): CoupleNotification => ({
        id: b.key,
        kind: "vendor",
        title: b.vendor ? `${b.name} confirmado: ${b.vendor}` : `${b.name} confirmado`,
        body: "",
        at: b.confirmedAt!,
      }),
    );
  return [...proposals, ...comments, ...reports, ...vendors].sort((a, b) => b.at.localeCompare(a.at));
}

export const unreadCount = (notes: CoupleNotification[], seenAt: string | null | undefined) =>
  notes.filter((n) => !seenAt || n.at > seenAt).length;

export const daysAgo = (iso: string, now = new Date()) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));

/** A pending proposal presented in the last week gets the "Nuevo" badge. */
export const isNewProposal = (p: Proposal, now = new Date()) =>
  isPresented(p) && p.status === "pending" && daysAgo(presentedAt(p), now) < NEW_FOR_DAYS;
