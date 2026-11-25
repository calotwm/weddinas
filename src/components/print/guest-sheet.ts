import type { Guest } from "@/core/couple";
import { GUEST_AGE_LABEL, guestSummary, sortGuests } from "@/core/guests";

export interface GuestSheetRow {
  id: string;
  lastName: string;
  name: string;
  /** "Adulto", "Niño"…; empty without an age. */
  age: string;
  table: string;
  menu: string;
}

/** The columns of the list the team sends, in the order the agency asked for. */
export const GUEST_SHEET_COLUMNS: { key: Exclude<keyof GuestSheetRow, "id">; label: string }[] = [
  { key: "lastName", label: "Apellido" },
  { key: "name", label: "Nombre" },
  { key: "age", label: "Edad" },
  { key: "table", label: "Mesa" },
  { key: "menu", label: "Menú" },
];

/** The guest list to send: rows in the team list order, plus confirmed over total guests. */
export function guestSheet(guests: Guest[]): { rows: GuestSheetRow[]; totals: { confirmed: number; total: number } } {
  const rows = sortGuests(guests).map((g) => ({
    id: g.id,
    lastName: g.lastName?.trim() ?? "",
    name: g.name,
    age: g.age ? (GUEST_AGE_LABEL[g.age] ?? "") : "",
    table: g.table,
    menu: g.restriction,
  }));
  const { confirmed, total } = guestSummary(guests);
  return { rows, totals: { confirmed, total } };
}
