import type { Guest, GuestAge, GuestStatus } from "./couple";

export const GUEST_STATUSES: GuestStatus[] = ["confirmed", "pending", "sent", "declined"];
export const GUEST_AGES: GuestAge[] = ["adult", "teen", "child", "baby"];
export const MAX_GUESTS = 1000;
/** Longest "Notas" text stored on a guest. */
export const MAX_GUEST_NOTES = 500;
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

/** Fields the list can filter by being empty, with the chip labels. */
export type MissingField = "table" | "restriction" | "transport" | "phone" | "age";

export const MISSING_FIELD_LABEL: Record<MissingField, string> = {
  table: "Sin mesa",
  restriction: "Sin menú",
  transport: "Sin combi",
  phone: "Sin teléfono",
  age: "Sin edad",
};

export const MISSING_FIELDS = Object.keys(MISSING_FIELD_LABEL) as MissingField[];

export function isMissing(guest: Guest, field: MissingField): boolean {
  if (field === "age") return !guest.age || !GUEST_AGES.includes(guest.age);
  return !(guest[field] ?? "").trim();
}

export interface GuestFilter {
  /** "all" or absent keeps every status. */
  status?: GuestStatus | "all";
  /** A table name; empty or absent keeps every table. */
  table?: string;
  /** Guests must have every one of these fields empty. */
  missing?: MissingField[];
  /** Free text matched against every text field of the guest, ignoring case and accents. */
  query?: string;
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Everything the list shows about a guest, as one searchable string (both name orders, so "Pérez Ana" finds her too). */
function searchable(guest: Guest): string {
  const { name, group, table, restriction, side, transport, phone, notes, age, status } = guest;
  const lastName = guest.lastName ?? "";
  const fields = [`${name} ${lastName}`, `${lastName} ${name}`, group, table, restriction, side, transport, phone, notes, age && GUEST_AGE_LABEL[age], GUEST_STATUS_LABEL[status]];
  return fields.map((f) => fold(f ?? "")).join(" | ");
}

/** The guests that pass every given filter; the order is kept. */
export function filterGuests<T extends Guest>(guests: T[], filter: GuestFilter): T[] {
  const { status = "all", table = "", missing = [], query = "" } = filter;
  const wanted = fold(query);
  return guests.filter(
    (g) =>
      (status === "all" || g.status === status) &&
      (!table || g.table.trim() === table) &&
      missing.every((field) => isMissing(g, field)) &&
      (!wanted || searchable(g).includes(wanted)),
  );
}

/** "Ingresaron": guests ticked as arrived; "Faltan ingresar": confirmed guests not ticked yet. */
export function arrivalCounts(guests: Guest[]): { arrived: number; missing: number } {
  return {
    arrived: guests.filter((g) => g.arrived).length,
    missing: guests.filter((g) => g.status === "confirmed" && !g.arrived).length,
  };
}

/** A full name typed in the invitation web: the last word is the last name ("Ana María Pérez" → "Ana María" + "Pérez"). */
export function splitFullName(full: string): { name: string; lastName: string } {
  const words = full.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { name: words.join(""), lastName: "" };
  return { name: words.slice(0, -1).join(" "), lastName: words[words.length - 1] };
}
