/**
 * Turns one couple's planner spreadsheets (the brief and the Drive folder sheets, already read into grids) into a
 * `CoupleImport` plus the warnings the team should review. Pure: no files, no service calls.
 *
 * Layouts (Weddinas' Google Sheets, exported as .xlsx):
 * - Brief: blocks are a title cell followed by "Detalle" and "Aclaraciones" cells, side by side in some tabs; the
 *   rows below are label / detail / note (a fourth cell is an extra note). A row without label continues the previous
 *   field. A block ends at the next title in its column or at an all-caps section label. "Proveedor" is the vendor,
 *   "Equipo" (or, in the "Extras" tab, the cell above the first block of a column) the owner, "Pago" only sets the
 *   status. "Nombres" (Datos generales) gives the partners and "Ideas generales" the ideas.
 * - Presupuesto: every table with "Presupuesto|CONCEPTO, AR$|$, USD, TC, %, Fecha, Obs" columns. Rows are grouped
 *   into one item per rubro and vendor; rows dated up to `today` are payments, later dates are the due date.
 * - Invitados: the guest importer. Timing: "Horario / Actividad / Descripción" and "Horario / Rubro / Empresa /
 *   Contacto". Canciones: "Momento / (sub-momento) / Canción / Artista / Estado / Notas". Fotos familiares:
 *   section markers (NOVIA / NOVIO or the partners' names) then "Nombre / Vinculo / Info relevante".
 */

import { BRIEF_CATALOG, catalogBlock, CUSTOM_BLOCK_NAME_MAX, customBlockKey, SONG_MOMENTS, type CatalogBlock } from "./brief-catalog";
import type { CellValue, GridSheet } from "./comparison-table";
import type { BlockStatus, BriefField, CustomMoment, FamilySide, Music, PaymentKind, SongChoice, SongStatus } from "./couple";
import type { CoupleImport } from "./couple-import";
import { GuestImportError, parseGuestGrid, type ImportedGuest } from "./guest-import";
import { songWithArtist } from "./music";
import type { BudgetItemInput, PaymentInput, TimingInput, VendorTimingInput } from "./portal-service";
import { slugify } from "./slug";
import { safeHttpUrl } from "./url";

export const SHEET_KINDS = ["brief", "presupuesto", "invitados", "timing", "canciones", "fotos-familiares"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export interface CoupleSheets {
  /** Name as written in the couples list ("Ana y Juan"); fallback for the partner names. */
  name: string;
  year: number;
  sheets: Partial<Record<SheetKind, GridSheet[]>>;
  /** Import day, "YYYY-MM-DD": payments are dated up to it; defaults to today. */
  today?: string;
}

export interface MigrationResult {
  /** null when the couple cannot be imported (see warnings). */
  data: CoupleImport | null;
  warnings: string[];
}

type Currency = BudgetItemInput["currency"];

// --- cells ---

/** Trimmed cell text; "-" and "-%" count as empty. */
function text(value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  const t = (typeof value === "number" ? String(value) : value).replace(/\r\n?/g, "\n").trim();
  return t === "-" || t === "-%" ? "" : t;
}

/** Lowercase, no accents, words separated by single spaces. */
const norm = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const at = (sheet: GridSheet, r: number, c: number) => text(sheet.rows[r]?.[c]);

function numberAt(sheet: GridSheet, r: number, c: number): number | null {
  const value = sheet.rows[r]?.[c];
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const t = text(value);
  return /^-?\d+(?:[.,]\d+)?$/.test(t) ? Number(t.replace(",", ".")) : null;
}

const joinLines = (...parts: string[]) => parts.filter(Boolean).join("\n");
const round2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, "0");
const sentenceCase = (value: string) => (value === value.toUpperCase() ? value.charAt(0) + value.slice(1).toLowerCase() : value);

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "dd/mm/yy", "dd/mm/yyyy" or "9 de octubre 2027" → "YYYY-MM-DD". */
function parseDay(value: string): string | null {
  const first = value.split("\n")[0].trim();
  let day: number, month: number, year: number;
  const numeric = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/.exec(first);
  const words = /(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+|del\s+)?(\d{4})/.exec(norm(first));
  if (numeric) [day, month, year] = [Number(numeric[1]), Number(numeric[2]), Number(numeric[3])];
  else if (words && MONTHS.includes(words[2])) [day, month, year] = [Number(words[1]), MONTHS.indexOf(words[2]) + 1, Number(words[3])];
  else return null;
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "20:30", "20:30 hs", "8 hs" → "HH:MM". */
function parseClock(value: string): string | null {
  const m = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(?:hs?\.?)?$/i.exec(value.trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2] ?? 0)];
  return h <= 23 && min <= 59 ? `${pad(h)}:${pad(min)}` : null;
}

// --- catalog lookups ---

/** Sheet titles that name a catalog rubro differently. */
const BLOCK_ALIASES: Record<string, string[]> = {
  ramo: ["ramos", "ramo"],
  dj: ["dj y tecnica", "dj", "tecnica"],
  espacio: ["salon"],
  barra: ["barra de tragos", "barra"],
  papeleria: ["papeleria"],
  fotoiman: ["foto iman", "cabina de fotos"],
  "arte-en-vivo": ["live art"],
  glitter: ["glitter", "tatuajes"],
  "noche-de-bodas": ["noche de bodas", "hospedaje"],
  torta: ["torta de bodas"],
};

const blockTerms = (entry: CatalogBlock) => [norm(entry.name), norm(entry.key), ...(BLOCK_ALIASES[entry.key] ?? [])];

/** Catalog key of a block title ("Ramos" → "ramo"), if any. */
function catalogKeyOf(title: string): string | undefined {
  const n = norm(title);
  const slug = slugify(title);
  return BRIEF_CATALOG.find((e) => blockTerms(e).includes(n) || e.key === slug || slugify(e.name) === slug)?.key;
}

/** Catalog keys mentioned anywhere in a text, in order of appearance ("Foto y video" → foto, video). */
function keysIn(value: string): string[] {
  const n = ` ${norm(value)} `;
  return BRIEF_CATALOG.map((e) => ({ key: e.key, pos: Math.min(...blockTerms(e).map((t) => n.indexOf(` ${t} `)).filter((i) => i >= 0)) }))
    .filter((m) => Number.isFinite(m.pos))
    .sort((a, b) => a.pos - b.pos)
    .map((m) => m.key);
}

/** True when a text only names rubros ("Espacio + Catering + Barra"), so it is not a vendor. */
function onlyRubros(value: string): boolean {
  let n = ` ${norm(value)} `;
  const terms = BRIEF_CATALOG.flatMap(blockTerms).sort((a, b) => b.length - a.length);
  for (const term of terms) n = n.split(` ${term} `).join(" ");
  return n.replace(/ y /g, " ").trim() === "";
}

/** Custom rubro name as the service stores it; returns the catalog key instead when the name is a catalog one. */
function rubroFor(name: string, custom: Set<string>, warnings: string[]): string {
  const known = catalogKeyOf(name);
  if (known) return known;
  let clean = name.replace(/\s+/g, " ").trim();
  if (clean.length > CUSTOM_BLOCK_NAME_MAX) {
    warnings.push(`Rubro "${clean}" acortado a ${CUSTOM_BLOCK_NAME_MAX} caracteres.`);
    clean = clean.slice(0, CUSTOM_BLOCK_NAME_MAX).trim();
  }
  const key = customBlockKey(clean);
  if (![...custom].some((n) => customBlockKey(n) === key)) custom.add(clean);
  return key;
}

const categoryLabel = (key: string, custom: Set<string>) => catalogBlock(key)?.name ?? [...custom].find((n) => customBlockKey(n) === key) ?? key;

// --- brief ---

interface RawField {
  label: string;
  detail: string;
  note: string;
}

interface RawBlock {
  title: string;
  owner: string;
  fields: RawField[];
}

/** An all-caps label alone on its row ("SIN PROVEEDOR") separates groups of blocks. */
const isSectionLabel = (label: string) => label === label.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(label);

function readBlocks(sheet: GridSheet): { blocks: RawBlock[]; ideas: string[] } {
  const headers: Array<{ r: number; c: number }> = [];
  sheet.rows.forEach((row, r) =>
    row.forEach((_, c) => {
      if (text(row[c]) && norm(text(row[c + 1])) === "detalle") headers.push({ r, c });
    }),
  );
  const headerCols = new Set(headers.map((h) => h.c));

  // In "Extras" the team member in charge of a column of blocks is written above its first block ("NAT").
  const owners = new Map<number, string>();
  if (norm(sheet.name) === "extras") {
    for (const c of headerCols) {
      const top = Math.min(...headers.filter((h) => h.c === c).map((h) => h.r));
      const owner = at(sheet, top - 1, c);
      if (owner && norm(at(sheet, top - 1, c + 1)) !== "detalle") owners.set(c, owner);
    }
  }

  const blocks = headers.map(({ r: top, c }) => {
    const below = headers.filter((h) => h.c === c && h.r > top).map((h) => h.r);
    const end = below.length > 0 ? Math.min(...below) : sheet.rows.length;
    const fields: RawField[] = [];
    for (let r = top + 1; r < end; r++) {
      const label = at(sheet, r, c);
      const detail = at(sheet, r, c + 1);
      const note = joinLines(at(sheet, r, c + 2), headerCols.has(c + 3) ? "" : at(sheet, r, c + 3));
      if (!label && !detail && !note) continue;
      if (label && !detail && !note && isSectionLabel(label)) break;
      const last = fields[fields.length - 1];
      if (!label) {
        if (last) Object.assign(last, { detail: joinLines(last.detail, detail), note: joinLines(last.note, note) });
        continue;
      }
      fields.push({ label, detail, note });
    }
    return { title: at(sheet, top, c), owner: owners.get(c) ?? "", fields };
  });

  const ideas: string[] = [];
  sheet.rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (norm(text(cell)) !== "ideas generales" || headerCols.has(c)) return;
      for (let below = r + 1; below < sheet.rows.length; below++) if (at(sheet, below, c)) ideas.push(at(sheet, below, c));
    }),
  );
  return { blocks, ideas };
}

const STATUS_RANK: BlockStatus[] = ["searching", "na", "deciding", "confirmed"];

interface BriefResult {
  brief: NonNullable<CoupleImport["brief"]>;
  ideas: string;
  /** Raw "Información del evento" details by normalized label. */
  event: Map<string, string>;
  names: [string, string] | null;
}

function parseBrief(sheets: GridSheet[], custom: Set<string>, warnings: string[]): BriefResult {
  const byKey = new Map<string, NonNullable<CoupleImport["brief"]>[number]>();
  const event = new Map<string, string>();
  const ideas: string[] = [];
  let names: [string, string] | null = null;

  for (const sheet of sheets) {
    sheet.rows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!names && norm(text(cell)) === "nombres") names = [at(sheet, r, c + 1), at(sheet, r, c + 2)];
      }),
    );
    const read = readBlocks(sheet);
    ideas.push(...read.ideas);

    for (const raw of read.blocks) {
      // The songs come from "Elección de canciones"; this block only repeats its moments.
      if (norm(raw.title) === "musica") continue;
      const key = rubroFor(raw.title, custom, warnings);
      const entry = catalogBlock(key);
      if (key === "evento") for (const f of raw.fields) event.set(norm(f.label), f.detail);

      let vendor = "";
      let contact = "";
      let owner = raw.owner;
      let paid = false;
      let vendorState: "none" | "named" | "no" = "none";
      const fields: BriefField[] = [];
      for (const f of raw.fields) {
        const label = norm(f.label);
        if (label === "proveedor") {
          const answer = norm(f.detail);
          if (answer === "no") vendorState = "no";
          else if (f.detail) {
            vendorState = "named";
            if (answer !== "si") vendor = f.detail;
          }
          // Its note stays as a field note; a bare "Si" (vendor not named yet) is kept there too.
          if (f.note || answer === "si") fields.push({ label: "Proveedor", detail: f.detail, note: f.note });
          continue;
        }
        if (label === "pago") {
          paid ||= Number((/\d+(?:[.,]\d+)?/.exec(f.detail)?.[0] ?? "0").replace(",", ".")) > 0;
          continue;
        }
        if (label === "equipo") {
          if (f.detail && norm(f.detail) !== "no") owner = f.detail;
          continue;
        }
        if (label === "contacto") {
          contact = [f.detail, f.note].filter(Boolean).join(" · ");
          continue;
        }
        if (!f.detail && !f.note) continue;
        const catalogLabel = entry?.fields.find((l) => norm(l) === label) ?? f.label;
        const same = fields.find((x) => x.label === catalogLabel);
        if (same) Object.assign(same, { detail: joinLines(same.detail, f.detail), note: joinLines(same.note, f.note) });
        else fields.push({ label: catalogLabel, detail: f.detail, note: f.note });
      }

      const status: BlockStatus = paid
        ? "confirmed"
        : vendorState === "no"
          ? "na"
          : vendorState === "named" || entry?.kind === "event"
            ? "deciding"
            : "searching";
      const previous = byKey.get(key);
      if (!previous) {
        byKey.set(key, { key, vendor, contact, status, owner, fields });
        continue;
      }
      // The same rubro twice (the ceremony in "Datos generales" and its officiant in "Extras"): one block.
      previous.vendor ||= vendor;
      previous.contact ||= contact;
      previous.owner ||= owner;
      if (STATUS_RANK.indexOf(status) > STATUS_RANK.indexOf(previous.status)) previous.status = status;
      previous.fields.push(...fields);
    }
  }
  // Template blocks nobody filled in would only clutter the brief.
  const filled = [...byKey.values()].filter((b) => b.vendor || b.contact || b.fields.length > 0 || b.status === "confirmed" || b.status === "na");
  return { brief: filled, ideas: ideas.join("\n"), event, names };
}

/** First hour in "18 a 03 hs" → "18:00"; hours below 10 are evening hours. */
function weddingTime(value: string): string {
  const m = /(\d{1,2})(?::(\d{2}))?/.exec(value);
  if (!m) return "18:00";
  let h = Number(m[1]);
  if (h < 10) h += 12;
  const min = Number(m[2] ?? 0);
  return h <= 23 && min <= 59 ? `${pad(h)}:${pad(min)}` : "18:00";
}

// --- budget ---

interface BudgetRow {
  label: string;
  kind: PaymentKind;
  ars: number | null;
  usd: number | null;
  tc: number | null;
  date: string | null;
  obs: string;
}

interface BudgetGroup {
  category: string;
  vendor: string;
  currency?: Currency;
  ipc: boolean;
  rows: BudgetRow[];
}

const KIND = /^(seña|sena|saldo|pago total|pago parcial|pago|iva|adicionales|adicional|flete|viáticos|viaticos|total)\b\s*\d*/i;

function paymentKind(prefix: string): PaymentKind {
  const n = norm(prefix);
  if (n.startsWith("sena")) return "sena";
  if (n.startsWith("saldo") || n.startsWith("pago total") || n.startsWith("total")) return "saldo";
  if (n.startsWith("iva")) return "iva";
  if (/^(adicional|flete|viatico)/.test(n)) return "adicional";
  return "intermedio";
}

/** "Seña - Foto - Lente" → kind "sena", rest "Foto - Lente"; "IVA Seña" → kind "iva", rest "". */
function splitLabel(label: string): { kind: PaymentKind; rest: string } {
  const m = KIND.exec(label);
  if (!m) return { kind: "intermedio", rest: label };
  const rest = label
    .slice(m[0].length)
    .replace(/^\s*(seña|sena|saldo)\b/i, "")
    .replace(/^\s*-\s*/, "")
    .trim();
  return { kind: paymentKind(m[0]), rest };
}

function parseBudget(sheets: GridSheet[], today: string, custom: Set<string>, warnings: string[]): NonNullable<CoupleImport["budget"]> | null {
  const groups = new Map<string, BudgetGroup>();
  let guests: number | null = null;

  for (const sheet of sheets) {
    if (norm(sheet.name) === "presupuesto" && guests === null) {
      sheet.rows.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (guests !== null || norm(text(cell)) !== "invitados") return;
          const value = numberAt(sheet, r, c + 1) ?? numberAt(sheet, r + 1, c);
          if (value !== null && value > 0) guests = Math.round(value);
        }),
      );
    }

    const headers: Array<{ r: number; c: number }> = [];
    sheet.rows.forEach((row, r) =>
      row.forEach((cell, c) => {
        const label = norm(text(cell));
        if ((label === "presupuesto" || label === "concepto") && norm(at(sheet, r, c + 3)) === "tc" && norm(at(sheet, r, c + 5)).startsWith("fecha")) headers.push({ r, c });
      }),
    );

    for (const { r: header, c } of headers) {
      let title = "";
      let metaVendor = "";
      let currency: Currency | undefined;
      let ipc = false;
      for (let r = 0; r < header; r++) {
        const label = norm(at(sheet, r, c));
        if (!title && at(sheet, r, c)) title = at(sheet, r, c);
        if (label === "proveedor elegido") metaVendor = at(sheet, r, c + 1);
        if (label === "cerrado en") {
          const value = norm(at(sheet, r, c + 1));
          currency = /dolar|usd/.test(value) ? "USD" : /peso|ars/.test(value) ? "ARS" : undefined;
        }
        if (norm(at(sheet, r, c + 1)) === "saldo" && /ipc/i.test(at(sheet, r, c + 2))) ipc = true;
      }
      // "Foto - Lente\nVideo - Cine": one rubro and vendor per line.
      const titleLines = (title || sheet.name).split("\n").map((line) => {
        const [rubro, ...vendor] = line.split(/\s+-\s+/);
        return { rubro: rubro.trim(), vendor: vendor.join(" - ").trim(), keys: keysIn(rubro) };
      });
      let candidates = [...new Set(titleLines.flatMap((l) => l.keys))];
      if (candidates.length === 0) candidates = keysIn(sheet.name);
      // A section outside the catalog ("WEDDING PLANNER") is a custom rubro; rows of a generic "Extras" tab name their rubro.
      const customName = norm(titleLines[0].rubro) === "extras" || !titleLines[0].rubro ? "Extras" : sentenceCase(titleLines[0].rubro);
      const titleVendor = (category: string) => titleLines.find((l) => l.keys.includes(category))?.vendor ?? (titleLines.length === 1 ? titleLines[0].vendor : "");
      let current: string | undefined;

      for (let r = header + 1; r < sheet.rows.length; r++) {
        const label = at(sheet, r, c);
        const n = norm(label);
        if (n === "total" || n.startsWith("actualizacion")) break;
        const [ars, usd, tc] = [numberAt(sheet, r, c + 1), numberAt(sheet, r, c + 2), numberAt(sheet, r, c + 3)];
        if (!(ars !== null && ars > 0) && !(usd !== null && usd > 0)) {
          // A lone rubro row ("FOTO", "VIDEO") switches the rubro of the rows below it.
          const sub = ars === null && usd === null && tc === null ? keysIn(label)[0] : undefined;
          if (sub && candidates.includes(sub)) current = sub;
          continue;
        }
        if (/estimad/i.test(label)) {
          warnings.push(`Presupuesto: "${label}" (${title.split("\n")[0] || sheet.name}) es un estimado; no se importa.`);
          continue;
        }

        const { kind, rest } = splitLabel(label);
        const segments = rest.split(/\s+-\s+/).map((s) => s.trim()).filter(Boolean);
        const rubroText = segments.length >= 2 ? segments.slice(0, -1).join(" ") : rest;
        const mentioned = [...keysIn(rubroText), ...keysIn(rest)];
        let category: string;
        if (candidates.length > 0) category = mentioned.find((k) => candidates.includes(k)) ?? current ?? candidates[0];
        else category = mentioned[0] ?? rubroFor(customName, custom, warnings);
        const vendor =
          metaVendor ||
          (segments.length >= 2 ? segments[segments.length - 1] : titleVendor(category) || (segments[0] && !onlyRubros(segments[0]) ? segments[0] : ""));

        const id = `${category}|${vendor}`;
        const group = groups.get(id) ?? { category, vendor, currency, ipc, rows: [] };
        groups.set(id, group);
        group.rows.push({ label, kind, ars, usd, tc, date: parseDay(at(sheet, r, c + 5)), obs: at(sheet, r, c + 6) });
      }
    }
  }

  const items: NonNullable<CoupleImport["budget"]>["items"] = [];
  for (const group of groups.values()) {
    const currency: Currency = group.currency ?? (group.rows.every((r) => r.usd !== null && Number.isInteger(r.usd)) ? "USD" : "ARS");
    const inCurrency = (row: BudgetRow) =>
      currency === "USD" ? (row.usd ?? (row.ars && row.tc ? row.ars / row.tc : null)) : (row.ars ?? (row.usd && row.tc ? row.usd * row.tc : null));
    const rows = group.rows.filter((row) => {
      if (inCurrency(row) !== null) return true;
      warnings.push(`Presupuesto: "${row.label}" no tiene monto en ${currency} ni TC; no se importa.`);
      return false;
    });
    if (rows.length === 0) continue;

    const paid = rows.filter((row) => row.date !== null && row.date <= today);
    const owed = rows.filter((row) => !paid.includes(row));
    const payments: PaymentInput[] = paid
      .map((row): PaymentInput => {
        const common = { date: row.date!, kind: row.kind, note: row.label };
        if (currency === "USD" && row.ars && row.tc) return { ...common, amount: round2(row.ars), currency: "ARS", arsPerUsd: row.tc };
        return { ...common, amount: round2(inCurrency(row)!), currency, arsPerUsd: null };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const due = owed.map((row) => row.date).filter((d): d is string => d !== null && d > today).sort();
    const notes = [...new Set(owed.map((row) => row.obs).filter((obs) => obs && !/^(congelado|se ajusta por ipc|iva)$/i.test(obs)))];

    const item: BudgetItemInput & { payments?: PaymentInput[] } = {
      category: group.category,
      vendor: group.vendor,
      concept: categoryLabel(group.category, custom),
      amount: round2(rows.reduce((sum, row) => sum + inCurrency(row)!, 0)),
      currency,
      adjustment: currency === "ARS" && (group.ipc || owed.some((row) => /ipc/i.test(row.obs))) ? "ipc" : "frozen",
      baseMonth: (payments[0]?.date ?? today).slice(0, 7),
      note: notes.join("\n"),
      ...(due.length > 0 && { dueDate: due[0] }),
      payments,
    };
    items.push(item);
  }
  if (items.length === 0 && guests === null) return null;
  return { usdQuote: "blue", guests, items };
}

// --- guests ---

/** Template rows hold "X" for unknown names: an "X" guest is dropped, an "X" last name cleared. */
function withoutPlaceholders(guests: ImportedGuest[], warnings: string[]): ImportedGuest[] {
  const kept = guests.filter((g) => norm(g.name) !== "x");
  const dropped = guests.length - kept.length;
  if (dropped === 1) warnings.push('Invitados: 1 fila de ejemplo ("X") omitida.');
  if (dropped > 1) warnings.push(`Invitados: ${dropped} filas de ejemplo ("X") omitidas.`);
  return kept.map(({ lastName, ...guest }) => (lastName && norm(lastName) !== "x" ? { ...guest, lastName } : guest));
}

// --- timing ---

function parseTiming(sheets: GridSheet[], warnings: string[]): { timing: TimingInput[]; vendorTiming: VendorTimingInput[] } {
  const timing: TimingInput[] = [];
  const vendorTiming: VendorTimingInput[] = [];
  for (const sheet of sheets) {
    const header = sheet.rows.findIndex((row) => row.some((cell) => norm(text(cell)) === "horario") && row.some((cell) => ["actividad", "rubro"].includes(norm(text(cell)))));
    if (header === -1) continue;
    const col = (name: string) => sheet.rows[header].findIndex((cell) => norm(text(cell)) === name);
    const [time, title, note, rubro, company, contact] = ["horario", "actividad", "descripcion", "rubro", "empresa", "contacto"].map(col);
    const vendors = title === -1;
    for (let r = header + 1; r < sheet.rows.length; r++) {
      const when = at(sheet, r, time);
      if (norm(when).startsWith("horario")) break;
      const what = at(sheet, r, vendors ? rubro : title);
      if (!what) continue;
      const clock = parseClock(when);
      if (!clock) {
        warnings.push(`${sheet.name}: "${what}" no tiene un horario válido; no se importa.`);
        continue;
      }
      if (vendors) vendorTiming.push({ time: clock, category: what, company: at(sheet, r, company), contact: at(sheet, r, contact) });
      else timing.push({ time: clock, title: what, note: at(sheet, r, note) });
    }
  }
  return { timing, vendorTiming };
}

// --- music ---

const STOP_WORDS = new Set(["de", "del", "la", "las", "el", "los", "a", "y"]);
const momentWords = (value: string) =>
  norm(value)
    .split(" ")
    .filter((w) => !STOP_WORDS.has(w))
    .join(" ");
/** Sheet labels that differ from the app's moment labels, by their words. */
const MOMENT_ALIASES: Record<string, string> = { "entrada cortejo": "cortejo", "salida novios": "salida" };
const MOMENTS = SONG_MOMENTS.flatMap((g) => g.moments.map((m) => ({ key: m.key, words: momentWords(m.label), group: g.group })));

function findMoment(label: string): { key: string; group: string } | undefined {
  const words = momentWords(label);
  return MOMENTS.find((m) => m.words === words || m.key === MOMENT_ALIASES[words]);
}

/** "Recepción\n(Set de Vinilos)" → base "Recepción", extra "Set de Vinilos". */
function splitMomentLabel(label: string): { base: string; extra: string } {
  const [first, ...lines] = label.split("\n");
  const extras = [...first.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim());
  const [base, ...dashed] = first.replace(/\([^)]*\)/g, "").split(/\s+-\s+/);
  extras.push(...dashed, ...lines.map((l) => l.replace(/^\(|\)$/g, "")));
  return { base: base.trim(), extra: joinLines(...extras.map((e) => e.trim())) };
}

/** Only "Elegida" counts as chosen; "Pendiente" and the retired "No aplica" import as pending. */
const SONG_STATUSES: Record<string, SongStatus> = { elegida: "chosen" };

function parseMusic(sheets: GridSheet[], warnings: string[]): Music | null {
  for (const sheet of sheets) {
    const header = sheet.rows.findIndex((row) => row.some((cell) => norm(text(cell)) === "momento") && row.some((cell) => norm(text(cell)) === "estado"));
    if (header === -1) continue;
    const cells = sheet.rows[header].map((cell) => norm(text(cell)));
    const [moment, song, artist, status] = ["momento", "cancion", "artista", "estado"].map((n) => cells.indexOf(n));
    const notes = cells.findIndex((n) => n.startsWith("notas"));
    const sub = cells[moment + 1] === "" ? moment + 1 : -1;

    const music: Music = { songs: [], playlistUrl: "", mustPlay: "", banned: "", customMoments: [] };
    const custom: CustomMoment[] = music.customMoments!;
    let top = "";
    let lastGroup = "Fiesta";
    const seen = new Set<string>();
    for (let r = header + 1; r < sheet.rows.length; r++) {
      const topCell = at(sheet, r, moment);
      const subCell = sub === -1 ? "" : at(sheet, r, sub);
      if (topCell) top = topCell;
      const label = subCell || topCell;
      if (!label || /[?!]$/.test(label.trim())) continue;
      const { base, extra } = splitMomentLabel(label);
      const content = [at(sheet, r, song), at(sheet, r, artist), at(sheet, r, notes)].filter(Boolean).join(" - ");
      const kind = norm(base);
      if (kind === "infaltables") music.mustPlay = joinLines(music.mustPlay, content);
      else if (kind === "prohibidos") music.banned = joinLines(music.banned, content);
      else if (kind === "link playlist" && at(sheet, r, song)) {
        music.playlistUrl = safeHttpUrl(at(sheet, r, song));
        if (!music.playlistUrl) warnings.push(`Canciones: el link de la playlist no es una URL válida ("${at(sheet, r, song)}").`);
      }
      if (["infaltables", "prohibidos", "link playlist"].includes(kind)) continue;

      const choice: Omit<SongChoice, "moment"> = {
        // The app has one song field: the sheet's "Artista" goes into it.
        song: songWithArtist(at(sheet, r, song), at(sheet, r, artist)),
        artist: "",
        status: SONG_STATUSES[norm(at(sheet, r, status))] ?? "pending",
        note: joinLines(extra, at(sheet, r, notes)),
      };
      const found = findMoment(base);
      if (found && !seen.has(found.key)) {
        seen.add(found.key);
        lastGroup = found.group;
        music.songs.push({ moment: found.key, ...choice });
        continue;
      }
      if (!choice.song && !choice.note && choice.status !== "chosen") continue;
      const topBase = splitMomentLabel(top).base;
      const group = subCell ? (SONG_MOMENTS.find((g) => norm(g.group) === norm(topBase))?.group ?? topBase) : lastGroup;
      const key = `import-${custom.length + 1}`;
      custom.push({ key, label: base, group });
      music.songs.push({ moment: key, ...choice });
    }
    return music;
  }
  return null;
}

// --- family ---

function parseFamily(sheets: GridSheet[], partners: [string, string], warnings: string[]): NonNullable<CoupleImport["family"]> {
  const family: NonNullable<CoupleImport["family"]> = [];
  for (const sheet of sheets) {
    const header = sheet.rows.findIndex((row) => row.some((cell) => norm(text(cell)) === "nombre") && row.some((cell) => norm(text(cell)) === "vinculo"));
    if (header === -1) continue;
    const cells = sheet.rows[header].map((cell) => norm(text(cell)));
    const [name, relation, info] = [cells.indexOf("nombre"), cells.indexOf("vinculo"), cells.indexOf("info relevante")];
    const marker = Math.max(0, name - 1);
    const firstNames = partners.map((p) => norm(p).split(" ")[0]);
    let side: FamilySide | undefined;
    let markers = 0;
    for (let r = header + 1; r < sheet.rows.length; r++) {
      const mark = marker === name ? "" : at(sheet, r, marker);
      if (mark) {
        if (mark.includes("?") || norm(mark).startsWith("como ")) continue;
        const n = norm(mark);
        markers++;
        side = n === "novia" || n === firstNames[0] ? "a" : n === "novio" || n === firstNames[1] ? "b" : markers === 1 ? "a" : "b";
      }
      const who = at(sheet, r, name);
      if (!who) continue;
      if (!side) {
        warnings.push(`Fotos familiares: "${who}" no está debajo de NOVIA ni NOVIO; se carga del lado de ${partners[0]}.`);
        side = "a";
      }
      family.push({ side, name: who, relation: at(sheet, r, relation), notes: info === -1 ? "" : at(sheet, r, info) });
    }
  }
  return family;
}

// --- couple ---

/** Builds the import file of one couple from its sheets; `data` is null when the couple cannot be imported. */
export function migrateCouple(input: CoupleSheets): MigrationResult {
  const warnings: string[] = [];
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const custom = new Set<string>();
  const { sheets } = input;

  const brief = parseBrief(sheets.brief ?? [], custom, warnings);
  const day = parseDay(brief.event.get("fecha") ?? "");
  if (!day) {
    warnings.push("Sin fecha de casamiento en el brief: la pareja no se importa.");
    return { data: null, warnings };
  }
  if (Number(day.slice(0, 4)) !== input.year) warnings.push(`La fecha del brief (${day}) no es de ${input.year}.`);

  const [fromListA, fromListB = ""] = input.name.split(/\s+y\s+/i);
  const [nameA, nameB] = brief.names ?? ["", ""];
  const partners: [string, string] = [nameA || fromListA.trim(), nameB || fromListB.trim()];

  const data: CoupleImport = { partnerA: partners[0], partnerB: partners[1], weddingDate: `${day}T${weddingTime(brief.event.get("hora") ?? "")}` };
  const venue = brief.event.get("lugar");
  if (venue) data.venue = venue;
  if (brief.ideas) data.ideas = brief.ideas;

  const budget = sheets.presupuesto ? parseBudget(sheets.presupuesto, today, custom, warnings) : null;
  const used = new Set([...brief.brief.map((b) => b.key), ...(budget?.items ?? []).map((i) => i.category)]);
  const customRubros = [...custom].filter((name) => used.has(customBlockKey(name)));
  if (customRubros.length > 0) data.customRubros = customRubros;
  if (brief.brief.length > 0) data.brief = brief.brief;
  if (budget) data.budget = budget;

  if (sheets.invitados) {
    try {
      data.guests = withoutPlaceholders(parseGuestGrid(sheets.invitados), warnings);
    } catch (e) {
      if (!(e instanceof GuestImportError)) throw e;
      warnings.push(`Invitados: ${e.message}`);
    }
  }
  if (sheets.timing) {
    const { timing, vendorTiming } = parseTiming(sheets.timing, warnings);
    if (timing.length > 0) data.timing = timing;
    if (vendorTiming.length > 0) data.vendorTiming = vendorTiming;
  }
  const music = sheets.canciones ? parseMusic(sheets.canciones, warnings) : null;
  if (music) data.music = music;
  const family = sheets["fotos-familiares"] ? parseFamily(sheets["fotos-familiares"], partners, warnings) : [];
  if (family.length > 0) data.family = family;
  return { data, warnings };
}
