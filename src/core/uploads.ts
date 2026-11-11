export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
/** Same cap as the comparison table upload. */
export const MAX_SPREADSHEET_BYTES = 5 * 1024 * 1024;

export interface FileType {
  ext: "jpg" | "png" | "webp" | "pdf" | "xlsx";
  mime: string;
}

const MIME: Record<FileType["ext"], string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Identifies an image by its leading bytes, ignoring whatever type the browser claimed (no SVG: it can carry scripts). */
export function detectImage(bytes: Uint8Array): FileType | null {
  const b = Buffer.from(bytes.subarray(0, 12));
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: MIME.jpg };
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: MIME.png };
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return { ext: "webp", mime: MIME.webp };
  return null;
}

/** Images plus PDF (quotes, invoices, receipts) for attachments. */
export function detectDocument(bytes: Uint8Array): FileType | null {
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-") return { ext: "pdf", mime: MIME.pdf };
  return detectImage(bytes);
}

const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_END = 0x06054b50;
const WORKBOOK_ENTRY = "xl/workbook.xml";

interface ZipEntry {
  name: string;
  /** Uncompressed size as the central directory declares it. */
  size: number;
}

/** Lists the zip's central directory without unzipping; null when the archive is malformed. Every offset is bounds-checked. */
function zipEntries(bytes: Uint8Array): ZipEntry[] | null {
  const b = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (b.length < 30 + 22 || b.readUInt32LE(0) !== ZIP_LOCAL) return null;
  // The end record is the last 22 bytes plus an optional comment of up to 65535 bytes.
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 0xffff); i--) {
    if (b.readUInt32LE(i) === ZIP_END) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  const count = b.readUInt16LE(end + 10);
  const dirEnd = b.readUInt32LE(end + 16) + b.readUInt32LE(end + 12);
  if (dirEnd > end) return null;
  const entries: ZipEntry[] = [];
  let at = b.readUInt32LE(end + 16);
  for (let n = 0; n < count; n++) {
    if (at + 46 > dirEnd || b.readUInt32LE(at) !== ZIP_CENTRAL) return null;
    const nameLength = b.readUInt16LE(at + 28);
    const next = at + 46 + nameLength + b.readUInt16LE(at + 30) + b.readUInt16LE(at + 32);
    if (next > dirEnd) return null;
    entries.push({ name: b.toString("latin1", at + 46, at + 46 + nameLength), size: b.readUInt32LE(at + 24) });
    at = next;
  }
  return entries;
}

/**
 * An Excel workbook (comparison tables only): a zip archive whose central directory lists `xl/workbook.xml`.
 * Reads only the end record and the directory headers; nothing is unzipped.
 */
export function detectXlsx(bytes: Uint8Array): FileType | null {
  return zipEntries(bytes)?.some((e) => e.name === WORKBOOK_ENTRY) ? { ext: "xlsx", mime: MIME.xlsx } : null;
}

/**
 * What a workbook's XML parts may expand to before exceljs opens it: a 5 MB upload can otherwise inflate to gigabytes.
 * The agency's real files stay under ~1 MB of XML (embedded images can be bigger and are not counted); 200k rows is ~70 MB.
 */
export const XLSX_LIMITS = { maxUncompressedBytes: 20 * 1024 * 1024, maxSheets: 30 };

/**
 * Checked before parsing, from the declared sizes in the zip directory. A forged directory can still understate sizes;
 * this stops honest-but-huge files and cheap zip bombs, the row/column caps apply after.
 */
export function xlsxLimitError(bytes: Uint8Array, limits = XLSX_LIMITS): "unreadable" | "too-big" | "too-many-sheets" | null {
  const entries = zipEntries(bytes);
  if (!entries?.some((e) => e.name === WORKBOOK_ENTRY)) return "unreadable";
  const xmlBytes = entries.filter((e) => /\.(xml|rels)$/.test(e.name)).reduce((sum, e) => sum + e.size, 0);
  if (xmlBytes > limits.maxUncompressedBytes) return "too-big";
  if (entries.filter((e) => /^xl\/worksheets\/[^/]+\.xml$/.test(e.name)).length > limits.maxSheets) return "too-many-sheets";
  return null;
}

const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf|xlsx)$/;

/** Generated file ids are a UUID plus a known extension, so they can never point outside a couple's folder. */
export const isFileId = (id: string) => FILE_ID.test(id);

export const mimeForFileId = (id: string) => MIME[id.slice(id.lastIndexOf(".") + 1) as FileType["ext"]];

/** Workbooks are always downloaded; images and PDFs open in the browser. */
export const contentDispositionForFileId = (id: string) => (id.endsWith(".xlsx") ? "attachment" : "inline");
