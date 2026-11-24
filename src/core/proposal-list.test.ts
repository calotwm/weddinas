import { describe, expect, it } from "vitest";
import type { Couple, Proposal } from "./couple";
import { proposalGroups } from "./proposal-list";

const proposal = (over: Partial<Proposal>): Proposal => ({
  id: "p",
  title: "Ambientación",
  description: "",
  link: "",
  amount: "",
  status: "pending",
  coupleComment: "",
  createdAt: "2026-10-01T10:00:00.000Z",
  respondedAt: null,
  presentedAt: "2026-10-02T10:00:00.000Z",
  ...over,
});

const couple = (id: string, proposals: Proposal[]): Couple => ({ id, partnerA: "A", partnerB: "B", weddingDate: "2027-03-01T19:00", proposals }) as Couple;

describe("proposalGroups", () => {
  const couples = [
    couple("c1", [
      proposal({ id: "late", presentedAt: "2026-10-05T10:00:00.000Z" }),
      proposal({ id: "early", presentedAt: "2026-10-01T10:00:00.000Z" }),
      proposal({ id: "draft", presentedAt: null }),
      proposal({ id: "yes", status: "approved", respondedAt: "2026-10-03T10:00:00.000Z" }),
    ]),
    couple("c2", [
      proposal({ id: "no", status: "rejected", respondedAt: "2026-10-09T10:00:00.000Z" }),
      proposal({ id: "gone", status: "discarded" }),
    ]),
    couple("c3", []),
  ];

  it("lists the presented proposals still waiting for the couple, oldest presented first, without drafts", () => {
    expect(proposalGroups(couples, "pending").map((g) => [g.couple.id, g.proposals.map((p) => p.id)])).toEqual([["c1", ["early", "late"]]]);
  });

  it("lists the approved and rejected ones, latest answer first, without discarded ones", () => {
    expect(proposalGroups(couples, "answered").map((g) => [g.couple.id, g.proposals.map((p) => p.id)])).toEqual([
      ["c2", ["no"]],
      ["c1", ["yes"]],
    ]);
  });
});
