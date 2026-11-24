import { isPresented, type Couple, type Proposal } from "./couple";

export type ProposalListKind = "pending" | "answered";

export interface ProposalGroup<C extends Pick<Couple, "proposals"> = Couple> {
  couple: C;
  proposals: Proposal[];
}

const latest = (ps: Proposal[]) => ps.reduce((max, p) => ((p.respondedAt ?? "") > max ? (p.respondedAt ?? "") : max), "");

/**
 * The proposals behind the home counters, per couple: "pending" are presented and still unanswered (oldest presented
 * first, couples in the order given); "answered" are approved or rejected (latest answer first, couples too).
 * Drafts and discarded proposals are left out, like in the counters.
 */
export function proposalGroups<C extends Pick<Couple, "proposals">>(couples: C[], kind: ProposalListKind): ProposalGroup<C>[] {
  const groups = couples
    .map((couple) => {
      const proposals =
        kind === "pending"
          ? couple.proposals.filter((p) => isPresented(p) && p.status === "pending").sort((a, b) => (a.presentedAt ?? "").localeCompare(b.presentedAt ?? ""))
          : couple.proposals.filter((p) => p.status === "approved" || p.status === "rejected").sort((a, b) => (b.respondedAt ?? "").localeCompare(a.respondedAt ?? ""));
      return { couple, proposals };
    })
    .filter((g) => g.proposals.length > 0);
  return kind === "answered" ? groups.sort((a, b) => latest(b.proposals).localeCompare(latest(a.proposals))) : groups;
}
