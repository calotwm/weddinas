/**
 * Guest list import from the agency's Excel ("Lista de invitados - <pareja>.xlsx").
 *
 * Expected sheet shape:
 * - A summary block may sit above the list; the header row is the first row, within the first
 *   `headerRows` rows, that has both APELLIDO and NOMBRE. The first sheet with such a row is used.
 * - Columns are found by label, ignoring accents, case and spaces: APELLIDO, NOMBRE, EDAD, RSVP, MESA,
 *   MENÚ, COMBI, RELACIÓN, INVITADO, VIAJA, TELEFONO. Anything else (N, MUSICA, MENSAJE…) is ignored.
 * - Rows without APELLIDO and NOMBRE are skipped (numbered template rows).
 * - EDAD Adulto/Teen/Niño/Bebé and RSVP Si/No/Enviado are mapped; unknown values stay empty / pending.
 */

import { readComparisonWorkbook, type CellValue, type GridSheet } from "./comparison-table";
import type { Guest, GuestAge, GuestStatus } from "./couple";
import { MAX_GUESTS } from "./guests";

/** Only the columns with a value are set (same shape the service takes for new guests). */
export type ImportedGuest = Pick<Guest, "name"> & Partial<Omit<Guest, "id" | "name">>;

export const GUEST_IMPORT_LIMITS = { maxBytes: 5 * 1024 * 1024, guests: MAX_GUESTS, headerRows: 40 };

/** A problem the user can fix in the file; the message is shown as is. */
export class GuestImportError extends Error {}

const NO_COLUMNS = "No encontramos las columnas APELLIDO y NOMBRE en el Excel.";
const NO_GUESTS = "No encontramos invitados debajo de APELLIDO y NOMBRE.";

/** Uppercase, no accents, no spaces: "Menú " → "MENU". */
const key = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();

type Column = "lastName" | "name" | "age" | "status" | "table" | "restriction" | "transport" | "group" | "side" | "travels" | "phone";

const COLUMNS: Record<string, Column> = {
  APELLIDO: "lastName",
  NOMBRE: "name",
  EDAD: "age",
  RSVP: "status",
  MESA: "table",
  MENU: "restriction",
  COMBI: "transport",
  RELACION: "group",
  INVITADO: "side",
  VIAJA: "travels",
  TELEFONO: "phone",
};

/** Same limits as the guest forms. */
const MAX_CHARS: Record<Exclude<Column, "age" | "status" | "travels">, number> = {
  lastName: 80,
  name: 120,
  table: 40,
  restriction: 120,
  transport: 80,
  group: 80,
  side: 80,
  phone: 40,
};

const AGES: Record<string, GuestAge> = { ADULTO: "adult", TEEN: "teen", NINO: "child", BEBE: "baby" };
const STATUSES: Record<string, GuestStatus> = { SI: "confirmed", NO: "declined", ENVIADO: "sent" };
const YES_NO: Record<string, boolean> = { SI: true, NO: false };

/** Cell text, trimmed; numbers keep no trailing ".0"; a lone "-" counts as empty. */
function cellText(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  const text = (typeof value === "number" ? String(value) : value).replace(/\s+/g, " ").trim();
  return text === "-" ? "" : text;
}

function findHeader(sheet: GridSheet): { row: number; columns: Map<number, Column> } | null {
  const last = Math.min(sheet.rows.length, GUEST_IMPORT_LIMITS.headerRows);
  for (let r = 0; r < last; r++) {
    const columns = new Map<number, Column>();
    (sheet.rows[r] ?? []).forEach((cell, c) => {
      const column = COLUMNS[key(cellText(cell))];
      if (column && ![...columns.values()].includes(column)) columns.set(c, column);
    });
    const found = [...columns.values()];
    if (found.includes("lastName") && found.includes("name")) return { row: r, columns };
  }
  return null;
}

function rowGuest(cells: CellValue[], columns: Map<number, Column>): ImportedGuest | null {
  const text: Partial<Record<Column, string>> = {};
  for (const [c, column] of columns) text[column] = cellText(cells[c]);
  const cap = (column: keyof typeof MAX_CHARS) => (text[column] ?? "").slice(0, MAX_CHARS[column]).trim();

  let name = cap("name");
  let lastName = cap("lastName");
  if (!name && !lastName) return null;
  if (!name) [name, lastName] = [lastName.slice(0, MAX_CHARS.name), ""];

  const guest: ImportedGuest = { name, status: STATUSES[key(text.status ?? "")] ?? "pending" };
  if (lastName) guest.lastName = lastName;
  const age = AGES[key(text.age ?? "")];
  if (age) guest.age = age;
  for (const column of ["table", "restriction", "transport", "group", "side", "phone"] as const) {
    const value = cap(column);
    if (value) guest[column] = value;
  }
  const travels = YES_NO[key(text.travels ?? "")];
  if (travels !== undefined) guest.travels = travels;
  return guest;
}

/** Guests from the first sheet with an APELLIDO + NOMBRE header; throws GuestImportError with a message for the user. */
export function parseGuestGrid(sheets: GridSheet[]): ImportedGuest[] {
  for (const sheet of sheets) {
    const header = findHeader(sheet);
    if (!header) continue;
    const guests: ImportedGuest[] = [];
    for (let r = header.row + 1; r < sheet.rows.length; r++) {
      const guest = rowGuest(sheet.rows[r] ?? [], header.columns);
      if (!guest) continue;
      if (guests.length >= GUEST_IMPORT_LIMITS.guests) throw new GuestImportError(`El Excel tiene más de ${GUEST_IMPORT_LIMITS.guests} invitados.`);
      guests.push(guest);
    }
    if (guests.length === 0) throw new GuestImportError(NO_GUESTS);
    return guests;
  }
  throw new GuestImportError(NO_COLUMNS);
}

/** Validates and parses an uploaded guest list; throws GuestImportError with a message for the user. */
export async function parseGuestFile(fileName: string, bytes: Uint8Array): Promise<ImportedGuest[]> {
  if (!/\.xlsx$/i.test(fileName)) throw new GuestImportError("Subí la lista en formato .xlsx (Excel).");
  if (bytes.byteLength > GUEST_IMPORT_LIMITS.maxBytes) throw new GuestImportError("La lista pesa más de 5 MB.");
  // xlsx files are zip archives.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new GuestImportError("El archivo no es un .xlsx válido.");
  let sheets: GridSheet[];
  try {
    sheets = await readComparisonWorkbook(bytes);
  } catch {
    throw new GuestImportError("No pudimos leer la lista. Descargala de nuevo como .xlsx y volvé a subirla.");
  }
  return parseGuestGrid(sheets);
}
