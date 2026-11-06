import { describe, expect, it } from "vitest";
import type { Proposal, Report } from "./couple";
import { coupleNotifications, daysAgo, isNewProposal, unreadCount } from "./notifications";

const proposal = (over: Partial<Proposal>): Proposal => ({
  id: "p",
  title: "Ambientación",
  description: "",
  link: "",
  amount: "",
  status: "pending",
  coupleComment: "",
  createdAt: "2026-11-01T10:00:00.000Z",
  respondedAt: null,
  ...over,
});

const report = (over: Partial<Report>): Report => ({ id: "r", title: "Reporte", body: "Avances", createdAt: "2026-10-01T10:00:00.000Z", ...over });

describe("coupleNotifications", () => {
  it("lists presented proposals and reports newest first, leaving drafts out", () => {
    const notes = coupleNotifications({
      proposals: [
        proposal({ id: "draft", presentedAt: null }),
        proposal({ id: "new", createdAt: "2026-10-20T10:00:00.000Z", presentedAt: "2026-11-03T10:00:00.000Z" }),
        proposal({ id: "legacy", createdAt: "2026-10-15T10:00:00.000Z" }),
      ],
      reports: [report({})],
    });
    expect(notes.map((n) => [n.id, n.kind, n.at])).toEqual([
      ["new", "proposal", "2026-11-03T10:00:00.000Z"],
      ["legacy", "proposal", "2026-10-15T10:00:00.000Z"],
      ["r", "report", "2026-10-01T10:00:00.000Z"],
    ]);
  });
});

describe("unreadCount", () => {
  const notes = coupleNotifications({ proposals: [proposal({ presentedAt: "2026-11-03T10:00:00.000Z" })], reports: [report({})] });

  it("counts everything when the couple never opened them", () => {
    expect(unreadCount(notes, undefined)).toBe(2);
    expect(unreadCount(notes, null)).toBe(2);
  });

  it("counts only what arrived after the last visit", () => {
    expect(unreadCount(notes, "2026-10-10T00:00:00.000Z")).toBe(1);
    expect(unreadCount(notes, "2026-11-04T00:00:00.000Z")).toBe(0);
  });
});

describe("isNewProposal", () => {
  const now = new Date("2026-11-06T12:00:00.000Z");

  it("marks pending proposals presented in the last 7 days", () => {
    expect(isNewProposal(proposal({ presentedAt: "2026-11-01T10:00:00.000Z" }), now)).toBe(true);
    expect(isNewProposal(proposal({ presentedAt: "2026-10-20T10:00:00.000Z" }), now)).toBe(false);
    expect(isNewProposal(proposal({ presentedAt: "2026-11-05T10:00:00.000Z", status: "approved" }), now)).toBe(false);
    expect(isNewProposal(proposal({ presentedAt: null }), now)).toBe(false);
  });

  it("counts whole days since a date", () => {
    expect(daysAgo("2026-11-06T08:00:00.000Z", now)).toBe(0);
    expect(daysAgo("2026-11-03T13:00:00.000Z", now)).toBe(2);
  });
});
