import { describe, expect, it } from "vitest";
import { coupleAlerts } from "./alerts";
import type { BudgetItem, ChecklistTask, Couple, Proposal } from "./couple";

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
  ...over,
});

const item = (over: Partial<BudgetItem>): BudgetItem => ({
  id: "b",
  category: "catering",
  vendor: "Sabores",
  concept: "",
  amount: 1000,
  currency: "ARS",
  adjustment: "frozen",
  baseMonth: "2026-01",
  note: "",
  payments: [],
  ...over,
});

const couple = (over: Partial<Couple>): Couple =>
  ({
    id: "c1",
    partnerA: "Delfi",
    partnerB: "Juancho",
    weddingDate: "2027-03-01T19:00",
    proposals: [],
    tasks: [],
    budget: { usdQuote: "blue", guests: null, items: [] },
    ...over,
  }) as Couple;

const today = "2026-11-06";
const now = new Date("2026-11-06T15:00:00.000Z");

describe("coupleAlerts", () => {
  it("flags presented proposals still pending for 7 days or more, and nothing else", () => {
    const alerts = coupleAlerts(
      [
        couple({
          proposals: [
            proposal({ id: "old", presentedAt: "2026-10-30T10:00:00.000Z" }),
            proposal({ id: "legacy", createdAt: "2026-10-01T10:00:00.000Z" }),
            proposal({ id: "recent", presentedAt: "2026-11-01T10:00:00.000Z" }),
            proposal({ id: "draft", presentedAt: null }),
            proposal({ id: "answered", presentedAt: "2026-10-01T10:00:00.000Z", status: "approved" }),
          ],
        }),
      ],
      today,
      now,
    );
    expect(alerts.filter((x) => x.kind === "proposal")).toEqual([
      { kind: "proposal", coupleId: "c1", names: "Delfi & Juancho", id: "legacy", title: "Ambientación", days: 36 },
      { kind: "proposal", coupleId: "c1", names: "Delfi & Juancho", id: "old", title: "Ambientación", days: 7 },
    ]);
  });

  it("asks to remind the couple from 19:00 of the second day until the week alert takes over", () => {
    const at = (iso: string) =>
      coupleAlerts(
        [
          couple({
            whatsapp: "5491122334455",
            proposals: [
              // Presented 10 Nov, 15:00 in Buenos Aires: reminder from 12 Nov, 19:00.
              proposal({ id: "dj", title: "DJ", presentedAt: "2026-11-10T18:00:00.000Z" }),
              proposal({ id: "answered", presentedAt: "2026-11-01T18:00:00.000Z", status: "rejected" }),
              proposal({ id: "draft", presentedAt: null }),
            ],
          }),
        ],
        iso.slice(0, 10),
        new Date(iso),
      );
    expect(at("2026-11-12T21:59:00.000Z")).toEqual([]);
    expect(at("2026-11-12T22:00:00.000Z")).toEqual([
      { kind: "reminder", coupleId: "c1", names: "Delfi & Juancho", id: "dj", title: "DJ", whatsapp: "5491122334455" },
    ]);
    expect(at("2026-11-17T22:00:00.000Z").map((x) => x.kind)).toEqual(["proposal"]);
  });

  it("flags payments due within 7 days or overdue with a pending balance", () => {
    const alerts = coupleAlerts(
      [
        couple({
          budget: {
            usdQuote: "blue",
            guests: null,
            items: [
              item({ id: "overdue", dueDate: "2026-11-01" }),
              item({ id: "soon", vendor: "", category: "foto", dueDate: "2026-11-13", currency: "USD" }),
              item({ id: "later", dueDate: "2026-11-14" }),
              item({ id: "paid", dueDate: "2026-11-02", payments: [{ id: "x", date: "2026-10-01", amount: 1000, currency: "ARS", arsPerUsd: null, kind: "saldo", note: "" }] }),
              item({ id: "nodate" }),
            ],
          },
        }),
      ],
      today,
      now,
    );
    expect(alerts).toEqual([
      { kind: "payment", coupleId: "c1", names: "Delfi & Juancho", id: "overdue", title: "Sabores", amount: 1000, currency: "ARS", dueDate: "2026-11-01", overdue: true },
      { kind: "payment", coupleId: "c1", names: "Delfi & Juancho", id: "soon", title: "Foto", amount: 1000, currency: "USD", dueDate: "2026-11-13", overdue: false },
    ]);
  });

  it("flags open checklist tasks of past months only", () => {
    const tasks = [
      { id: "past", title: "Elegir DJ", done: false, month: "2026-10" },
      { id: "past-done", title: "Señar salón", done: true, month: "2026-09" },
      { id: "this", title: "Prueba de vestido", done: false, month: "2026-11" },
      { id: "nomonth", title: "Lista de invitados", done: false },
    ] as ChecklistTask[];
    expect(coupleAlerts([couple({ tasks })], today, now)).toEqual([
      { kind: "task", coupleId: "c1", names: "Delfi & Juancho", id: "past", title: "Elegir DJ", month: "2026-10" },
    ]);
  });

  it("lists payments first, then reminders, proposals and tasks, across couples", () => {
    const a = couple({ id: "a", tasks: [{ id: "t", title: "T", done: false, month: "2026-01" } as ChecklistTask] });
    const b = couple({
      id: "b",
      proposals: [proposal({ id: "p", presentedAt: "2026-10-01T10:00:00.000Z" })],
      budget: { usdQuote: "blue", guests: null, items: [item({ id: "i", dueDate: "2026-11-07" })] },
    });
    const c = couple({ id: "c", proposals: [proposal({ id: "r", presentedAt: "2026-11-02T10:00:00.000Z" })] });
    expect(coupleAlerts([a, b, c], today, now).map((x) => `${x.kind}:${x.coupleId}`)).toEqual(["payment:b", "reminder:c", "proposal:b", "task:a"]);
  });

  it("returns nothing when no couple needs attention", () => {
    expect(coupleAlerts([couple({})], today, now)).toEqual([]);
  });
});
