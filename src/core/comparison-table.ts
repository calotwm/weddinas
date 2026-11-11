import { xlsxLimitError } from "./uploads";
/**
 * Vendor comparison tables ("cuadro comparativo"): the agency's own Excel, one vendor per row block,
 * turned into plain text cells the couple sees inside a proposal.
 *
 * Expected sheet shape (see the agency's models):
 * - Row 1 holds the headers; the first column holds the vendor names (blank header → "Proveedor").
 * - Optional second header row ("Producto" / "Valor") under group headers merged across columns, or when
 *   row-1 headers are merged down into row 2. Labels are flattened as "Ceremonia · Producto".
 * - Columns end at the first blank header: side cells after it ("DOLAR HOY", notes) are ignored.
 * - A vendor spans every row until the next vendor name (its cell is usually merged down); rows before
 *   the first named vendor, or under a vendor merge left blank (empty template rows), are dropped.
 * - A row whose only content is a cell merged across most columns ("Foto", "Video") becomes the group of
 *   the vendors under it.
 * - Every visible sheet with vendors becomes a section; sheets without vendors are skipped.
 *
 * Numbers become text by column header: "USD"/"dólar" columns as "USD 1.234" (no decimals); money columns
 * ("Valor", "Total", "Precio", "$") as "$ 12.500" from 1000 on; everything else as a plain number.
 */

export interface ComparisonVendor {
  name: string;
  /** Label of the merged section row above this vendor ("Foto", "Video"), when the sheet has them. */
  group?: string;
  /** One cell per column after the vendor column (`columns.slice(1)`). */
  rows: string[][];
}

export interface ComparisonSheet {
  name: string;
  /** columns[0] labels the vendor column. */
  columns: string[];
  vendors: ComparisonVendor[];
}

export interface ComparisonTable {
  fileName: string;
  uploadedAt: string;
  sheets: ComparisonSheet[];
  /** The original .xlsx, kept as a team-only attachment of the same proposal. */
  attachmentId?: string;
}

export type CellValue = string | number | null;

/** 0-based, inclusive. */
export interface CellRange {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/** A sheet as a plain grid, so parsing does not depend on the xlsx library. */
export interface GridSheet {
  name: string;
  rows: CellValue[][];
  merges: CellRange[];
}

export const COMPARISON_LIMITS = { maxBytes: 5 * 1024 * 1024, sheets: 10, rows: 200, columns: 30, cellChars: 2000 };

/** A problem the team can fix in the file; the message is shown as is. */
export class ComparisonTableError extends Error {}

const NO_VENDORS = "No encontramos proveedores en el cuadro. Revisá que la primera columna tenga los nombres.";

function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** "B3:AA12" → { top: 2, left: 1, bottom: 11, right: 26 }. */
export function parseRange(range: string): CellRange {
  const [from, to = from] = range.toUpperCase().split(":");
  const cell = (ref: string) => {
    const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(ref);
    if (!m) throw new Error(`Invalid cell reference: ${ref}`);
    return { row: Number(m[2]) - 1, col: columnIndex(m[1]) };
  };
  const a = cell(from);
  const b = cell(to);
  return { top: Math.min(a.row, b.row), left: Math.min(a.col, b.col), bottom: Math.max(a.row, b.row), right: Math.max(a.col, b.col) };
}

type ColumnKind = "usd" | "ars" | "plain";

function columnKind(label: string): ColumnKind {
  if (/usd|d[oó]lar/i.test(label)) return "usd";
  if (/valor|total|precio|\$/i.test(label)) return "ars";
  return "plain";
}

const integer = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

function formatNumber(n: number, kind: ColumnKind): string {
  if (kind === "usd") return `USD ${integer.format(Math.round(n))}`;
  if (kind === "ars" && Math.abs(n) >= 1000) return `$ ${integer.format(Math.round(n))}`;
  return Number.isInteger(n) && Math.abs(n) < 1000 ? String(n) : decimal.format(n);
}

const cleanText = (value: string) => value.replace(/\r\n?/g, "\n").trim().slice(0, COMPARISON_LIMITS.cellChars);

function parseSheet(sheet: GridSheet): ComparisonSheet | null {
  const { rows, merges } = sheet;
  const mergeAt = (r: number, c: number) => merges.find((m) => r >= m.top && r <= m.bottom && c >= m.left && c <= m.right);
  // A merged area shows its value once, in its top-left cell.
  const own = (r: number, c: number): CellValue => {
    const m = mergeAt(r, c);
    if (m && (m.top !== r || m.left !== c)) return null;
    return rows[r]?.[c] ?? null;
  };
  const text = (value: CellValue) => (value === null ? "" : typeof value === "number" ? String(value) : cleanText(value));

  // Header labels: a merge that starts on row 1 labels every column it covers.
  const label1 = (c: number) => {
    const m = mergeAt(0, c);
    return text(m && m.top === 0 ? (rows[0]?.[m.left] ?? null) : (rows[0]?.[c] ?? null));
  };
  const width = Math.max(0, ...rows.slice(0, 2).map((r) => r.length), ...merges.filter((m) => m.top === 0).map((m) => m.right + 1));
  let end = 1;
  while (end < width && label1(end)) end++;
  if (end <= 1) return null;
  if (end > COMPARISON_LIMITS.columns) throw new ComparisonTableError(`La hoja "${sheet.name}" tiene más de ${COMPARISON_LIMITS.columns} columnas.`);

  const twoRows = merges.some((m) => m.top === 0 && m.left < end && (m.bottom >= 1 || m.right > m.left));
  const label2 = (c: number) => {
    if (!twoRows) return "";
    const m = mergeAt(1, c);
    if (m && m.top === 0) return "";
    return text(m ? (rows[1]?.[m.left] ?? null) : (rows[1]?.[c] ?? null));
  };
  const columns = Array.from({ length: end }, (_, c) => {
    const [a, b] = [label1(c), label2(c)];
    return a && b && a !== b ? `${a} · ${b}` : a || b;
  });
  if (!columns[0]) columns[0] = "Proveedor";
  const kinds = columns.map(columnKind);

  const vendors: ComparisonVendor[] = [];
  let current: ComparisonVendor | null = null;
  let group: string | undefined;
  let rowCount = 0;

  for (let r = twoRows ? 2 : 1; r < rows.length; r++) {
    const filled = Array.from({ length: end }, (_, c) => c).filter((c) => own(r, c) !== null && text(own(r, c)) !== "");

    // A lone value merged across most columns: a section heading ("Foto", "Video").
    if (filled.length === 1) {
      const m = mergeAt(r, filled[0]);
      if (m && m.top === r && m.left === filled[0] && m.right - m.left + 1 >= Math.max(2, Math.ceil(end / 2))) {
        group = text(own(r, filled[0]));
        current = null;
        continue;
      }
    }

    const vendorMerge = mergeAt(r, 0);
    const continues = vendorMerge !== undefined && vendorMerge.top < r;
    const name = text(own(r, 0));
    if (!continues && (name || vendorMerge)) {
      // A new block; one with a blank name (template rows) is dropped with its rows.
      current = name ? { name, ...(group ? { group } : {}), rows: [] } : null;
      if (current) vendors.push(current);
    }
    if (!current) continue;

    const cells = kinds.slice(1).map((kind, i) => {
      const value = own(r, i + 1);
      return typeof value === "number" ? formatNumber(value, kind) : text(value);
    });
    if (current.rows.length > 0 && cells.every((cell) => cell === "")) continue;
    if (++rowCount > COMPARISON_LIMITS.rows) throw new ComparisonTableError(`La hoja "${sheet.name}" tiene más de ${COMPARISON_LIMITS.rows} filas.`);
    current.rows.push(cells);
  }

  return vendors.length > 0 ? { name: cleanText(sheet.name).slice(0, 100), columns, vendors } : null;
}

/** Parses the sheets of a comparison workbook; throws ComparisonTableError with a message for the team. */
export function parseComparisonGrid(sheets: GridSheet[], meta: { fileName: string; uploadedAt: string }): ComparisonTable {
  if (sheets.length > COMPARISON_LIMITS.sheets) throw new ComparisonTableError(`El archivo tiene más de ${COMPARISON_LIMITS.sheets} hojas.`);
  const parsed = sheets.map(parseSheet).filter((s): s is ComparisonSheet => s !== null);
  if (parsed.length === 0) throw new ComparisonTableError(NO_VENDORS);
  return { fileName: meta.fileName, uploadedAt: meta.uploadedAt, sheets: parsed };
}

// --- xlsx adapter (server only: exceljs is loaded on demand) ---

const MAX_READ_ROWS = 2000;
const MAX_READ_COLUMNS = 60;

const pad = (n: number) => String(n).padStart(2, "0");

function toCellValue(value: unknown, numFmt: string | undefined): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return numFmt?.includes("%") ? `${decimal.format(value * 100)}%` : value;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value instanceof Date) return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
  if (typeof value === "object") {
    const v = value as { richText?: { text: string }[]; text?: unknown; result?: unknown; formula?: unknown; sharedFormula?: unknown };
    if (Array.isArray(v.richText)) return v.richText.map((part) => part.text).join("");
    if ("formula" in v || "sharedFormula" in v) return toCellValue(v.result, numFmt);
    if ("text" in v) return toCellValue(v.text, numFmt);
  }
  return null;
}

/** The workbook is too large (or not a workbook) to open safely; thrown before exceljs inflates anything. */
export class WorkbookLimitError extends Error {
  constructor(readonly reason: "unreadable" | "too-big" | "too-many-sheets") {
    super(`Workbook rejected: ${reason}`);
  }
}

/** Message for a workbook over the limits; unreadable files keep each importer's own "could not read" message. */
export const workbookLimitMessage = (reason: "too-big" | "too-many-sheets", what: string) =>
  reason === "too-big"
    ? `${what} es demasiado grande para leerlo. Dejá solo la hoja que hace falta y volvé a subirlo.`
    : `${what} tiene demasiadas hojas. Dejá solo las que hacen falta y volvé a subirlo.`;

/** Reads the visible sheets of an xlsx file into plain grids. */
export async function readComparisonWorkbook(bytes: Uint8Array): Promise<GridSheet[]> {
  const limit = xlsxLimitError(bytes);
  if (limit) throw new WorkbookLimitError(limit);
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook.worksheets
    .filter((ws) => ws.state === "visible" || ws.state === undefined)
    .map((ws) => {
      const rows: CellValue[][] = [];
      ws.eachRow({ includeEmpty: false }, (row, number) => {
        if (number > MAX_READ_ROWS) return;
        const cells: CellValue[] = [];
        for (let c = 1; c <= Math.min(row.cellCount, MAX_READ_COLUMNS); c++) {
          const cell = row.getCell(c);
          cells.push(cell.type === ExcelJS.ValueType.Merge ? null : toCellValue(cell.value, cell.numFmt));
        }
        rows[number - 1] = cells;
      });
      for (let r = 0; r < rows.length; r++) rows[r] ??= [];
      const merges = (ws.model.merges ?? []).map(parseRange).filter((m) => m.top < MAX_READ_ROWS && m.left < MAX_READ_COLUMNS);
      return { name: ws.name, rows, merges };
    });
}

/** Validates and parses an uploaded comparison file; throws ComparisonTableError with a message for the team. */
export async function parseComparisonFile(fileName: string, bytes: Uint8Array, uploadedAt: string): Promise<ComparisonTable> {
  if (!/\.xlsx$/i.test(fileName)) throw new ComparisonTableError("Subí el cuadro en formato .xlsx (Excel).");
  if (bytes.byteLength > COMPARISON_LIMITS.maxBytes) throw new ComparisonTableError("El cuadro pesa más de 5 MB.");
  // xlsx files are zip archives.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new ComparisonTableError("El archivo no es un .xlsx válido.");
  let sheets: GridSheet[];
  try {
    sheets = await readComparisonWorkbook(bytes);
  } catch (e) {
    if (e instanceof WorkbookLimitError && e.reason !== "unreadable") throw new ComparisonTableError(workbookLimitMessage(e.reason, "El cuadro"));
    throw new ComparisonTableError("No pudimos leer el cuadro. Descargalo de nuevo como .xlsx y volvé a subirlo.");
  }
  const name = (fileName.split(/[\\/]/).pop() ?? "").replace(/[<>:"|?*\u0000-\u001f]/g, "").trim().slice(0, 120) || "cuadro.xlsx";
  return parseComparisonGrid(sheets, { fileName: name, uploadedAt });
}
