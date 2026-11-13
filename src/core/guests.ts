import type { Guest, GuestAge, GuestStatus } from "./couple";

export const GUEST_STATUSES: GuestStatus[] = ["confirmed", "pending", "sent", "declined"];
export const GUEST_AGES: GuestAge[] = ["adult", "teen", "child", "baby"];
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
  /** Invitation not sent yet ("Sin enviar"). */
  pending: number;
  /** Invitation sent, no answer yet. */
  sent: number;
  declined: number;
  /** Guests still invited: everyone except the ones who declined. */
  expected: number;
  /** Confirmed over `expected` (declined guests are left out), rounded; 0 when nobody is expected. */
  confirmedPercent: number;
  /** Composition by age over the whole list, like the agency's sheet; `unknown` counts guests without an age. */
  ages: Record<GuestAge | "unknown", number>;
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
  const aged = (age: GuestAge) => guests.filter((g) => g.age === age).length;
  const confirmed = count("confirmed");
  const declined = count("declined");
  const coming = guests.filter((g) => g.status !== "declined");
  return {
    total: guests.length,
    confirmed,
    pending: count("pending"),
    sent: count("sent"),
    declined,
    expected: coming.length,
    confirmedPercent: coming.length ? Math.round((confirmed / coming.length) * 100) : 0,
    ages: {
      adult: aged("adult"),
      teen: aged("teen"),
      child: aged("child"),
      baby: aged("baby"),
      unknown: guests.filter((g) => !g.age || !GUEST_AGES.includes(g.age)).length,
    },
    tables: tally(coming.map((g) => g.table)),
    unseated: coming.filter((g) => !g.table.trim()).length,
    restrictions: tally(coming.map((g) => g.restriction)),
  };
}

/** "Pérez, Ana" when the guest has a last name, else the name alone. */
export function guestDisplayName(guest: Pick<Guest, "name" | "lastName">): string {
  const lastName = guest.lastName?.trim();
  return lastName ? `${lastName}, ${guest.name}` : guest.name;
}

/** A sorted copy: by last name (or the name when there is none), then name; ties keep their order. */
export function sortGuests<T extends Pick<Guest, "name" | "lastName">>(guests: T[]): T[] {
  const key = (g: T) => g.lastName?.trim() || g.name;
  return [...guests].sort((a, b) => collator.compare(key(a), key(b)) || collator.compare(a.name, b.name));
}

/** One guest per pasted line; drops blank lines and list bullets or numbering ("- ", "• ", "2. "). */
export function parseGuestNames(pasted: string): string[] {
  return pasted
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim().slice(0, MAX_NAME).trim())
    .filter(Boolean)
    .slice(0, MAX_PASTED);
}

/**
 * A key built from the saved values of a guest's row form. React 19 resets a form after its action, and an
 * uncontrolled <select> resets to the option it mounted with (React never updates it when defaultValue changes),
 * so the row would show the old status and save it back. Keying the form by this remounts it with the saved values.
 */
export function guestFormKey(guest: Guest): string {
  const { id, name, lastName, group, status, table, restriction, age, side, transport, phone, travels } = guest;
  return JSON.stringify([id, name, lastName, group, status, table, restriction, age, side, transport, phone, travels]);
}

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  confirmed: "Confirmado",
  pending: "Pendiente",
  sent: "Enviado",
  declined: "No viene",
};

export const GUEST_AGE_LABEL: Record<GuestAge, string> = {
  adult: "Adulto",
  teen: "Teen",
  child: "Niño",
  baby: "Bebé",
};
