import type { Guest, GuestStatus } from "./couple";

export const GUEST_STATUSES: GuestStatus[] = ["confirmed", "pending", "declined"];
export const MAX_GUESTS = 1000;
const MAX_PASTED = 500;
const MAX_NAME = 120;

export interface Tally {
  name: string;
  count: number;
}

export interface GuestSummary {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  /** Guests still invited: everyone except the ones who declined. */
  expected: number;
  /** Confirmed over `expected` (declined guests are left out), rounded; 0 when nobody is expected. */
  confirmedPercent: number;
  /** Tables with the number of expected guests seated there. */
  tables: Tally[];
  /** Expected guests without a table yet. */
  unseated: number;
  /** Dietary restrictions with the number of expected guests that have them. */
  restrictions: Tally[];
}

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

/** Counts values case- and accent-insensitively, keeping the first spelling seen. */
function tally(values: string[]): Tally[] {
  const byKey = new Map<string, Tally>();
  for (const raw of values) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const entry = byKey.get(key);
    if (entry) entry.count++;
    else byKey.set(key, { name, count: 1 });
  }
  return [...byKey.values()].sort((a, b) => collator.compare(a.name, b.name));
}

export function guestSummary(guests: Guest[]): GuestSummary {
  const count = (status: GuestStatus) => guests.filter((g) => g.status === status).length;
  const confirmed = count("confirmed");
  const declined = count("declined");
  const coming = guests.filter((g) => g.status !== "declined");
  return {
    total: guests.length,
    confirmed,
    pending: count("pending"),
    declined,
    expected: coming.length,
    confirmedPercent: coming.length ? Math.round((confirmed / coming.length) * 100) : 0,
    tables: tally(coming.map((g) => g.table)),
    unseated: coming.filter((g) => !g.table.trim()).length,
    restrictions: tally(coming.map((g) => g.restriction)),
  };
}

/** One guest per pasted line; drops blank lines and list bullets or numbering ("- ", "• ", "2. "). */
export function parseGuestNames(pasted: string): string[] {
  return pasted
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim().slice(0, MAX_NAME).trim())
    .filter(Boolean)
    .slice(0, MAX_PASTED);
}

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  confirmed: "Confirmado",
  pending: "Pendiente",
  declined: "No viene",
};
