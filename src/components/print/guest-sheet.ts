import type { Guest } from "@/core/couple";
import { GUEST_STATUS_LABEL, guestSummary, sortGuests } from "@/core/guests";

export interface GuestSheetRow {
  /** 1-based position on the printed list. */
  n: number;
  id: string;
  lastName: string;
  name: string;
  table: string;
  menu: string;
  status: string;
}

/** The printed guest list: numbered rows in the team list order, plus confirmed over total guests. */
export function guestSheet(guests: Guest[]): { rows: GuestSheetRow[]; totals: { confirmed: number; total: number } } {
  const rows = sortGuests(guests).map((g, i) => ({
    n: i + 1,
    id: g.id,
    lastName: g.lastName?.trim() ?? "",
    name: g.name,
    table: g.table,
    menu: g.restriction,
    status: GUEST_STATUS_LABEL[g.status] ?? g.status,
  }));
  const { confirmed, total } = guestSummary(guests);
  return { rows, totals: { confirmed, total } };
}
