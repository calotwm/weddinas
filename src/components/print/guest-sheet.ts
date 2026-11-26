import type { Guest } from "@/core/couple";
import { GUEST_AGE_LABEL, guestSummary, sortGuests, splitLists } from "@/core/guests";

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

const sheetRow = (g: Guest): GuestSheetRow => ({
  id: g.id,
  lastName: g.lastName?.trim() ?? "",
  name: g.name,
  age: g.age ? (GUEST_AGE_LABEL[g.age] ?? "") : "",
    table: g.table,
  menu: g.restriction,
});

/** The guest list to send: list A rows in the team list order, list B rows apart, plus list A's confirmed over total. */
export function guestSheet(guests: Guest[]): { rows: GuestSheetRow[]; listB: GuestSheetRow[]; totals: { confirmed: number; total: number } } {
  const { a, b } = splitLists(sortGuests(guests));
  const { confirmed, total } = guestSummary(guests);
  return { rows: a.map(sheetRow), listB: b.map(sheetRow), totals: { confirmed, total } };
}
