import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { contentDispositionForFileId, detectDocument, detectImage, detectXlsx, isFileId, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES, MAX_SPREADSHEET_BYTES, mimeForFileId } from "./uploads";
import { LocalFileStore } from "@/infra/local-file-store";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([1, 2, 3, 4]), Buffer.from("WEBPVP8 ")]);

describe("detectImage", () => {
  it("recognizes JPEG, PNG and WebP by their bytes", () => {
    expect(detectImage(jpeg)).toEqual({ ext: "jpg", mime: "image/jpeg" });
    expect(detectImage(png)).toEqual({ ext: "png", mime: "image/png" });
    expect(detectImage(webp)).toEqual({ ext: "webp", mime: "image/webp" });
  });

  it("rejects other content even when it claims to be an image", () => {
    expect(detectImage(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImage(Buffer.from("GIF89a"))).toBeNull();
    expect(detectImage(Buffer.alloc(0))).toBeNull();
  });

  it("caps uploads at 5 MB", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});

const pdf = Buffer.from("%PDF-1.7\n%");

describe("detectDocument", () => {
  it("accepts PDFs and the same images, up to 10 MB", () => {
    expect(detectDocument(pdf)).toEqual({ ext: "pdf", mime: "application/pdf" });
    expect(detectDocument(png)).toEqual({ ext: "png", mime: "image/png" });
    expect(MAX_DOCUMENT_BYTES).toBe(10 * 1024 * 1024);
  });

  it("rejects HTML and SVG", () => {
    expect(detectDocument(Buffer.from("<html><script>"))).toBeNull();
    expect(detectDocument(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
  });

  it("never lets images-only uploads take a PDF", () => {
    expect(detectImage(pdf)).toBeNull();
  });
});

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function realXlsx(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Hoja 1").addRow(["Dj", "Total $"]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/** A stored (uncompressed) zip with the given entries; CRCs are left at 0 since only names are checked. */
function zip(names: string[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const name of names) {
    const n = Buffer.from(name, "latin1");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(n.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, n);
    centrals.push(central, n);
    offset += 30 + n.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

describe("detectXlsx", () => {
  it("accepts a real workbook", async () => {
    expect(detectXlsx(await realXlsx())).toEqual({ ext: "xlsx", mime: XLSX_MIME });
    expect(detectXlsx(zip(["[Content_Types].xml", "xl/workbook.xml"]))).toEqual({ ext: "xlsx", mime: XLSX_MIME });
  });

  it("rejects zips without a workbook entry, even when a similar name is there", () => {
    expect(detectXlsx(zip(["word/document.xml"]))).toBeNull();
    expect(detectXlsx(zip(["xl/workbook.xml.bak", "x/xl/workbook.xml"]))).toBeNull();
    expect(detectXlsx(Buffer.concat([zip(["a.txt"]), Buffer.from("xl/workbook.xml")]))).toBeNull();
  });

  it("rejects PDFs, images and truncated or corrupt archives", async () => {
    expect(detectXlsx(pdf)).toBeNull();
    expect(detectXlsx(png)).toBeNull();
    expect(detectXlsx(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBeNull();
    expect(detectXlsx(Buffer.alloc(0))).toBeNull();
    const book = await realXlsx();
    expect(detectXlsx(book.subarray(0, book.length - 30))).toBeNull();
    const badOffset = zip(["xl/workbook.xml"]);
    badOffset.writeUInt32LE(0xffffff00, badOffset.length - 6);
    expect(detectXlsx(badOffset)).toBeNull();
  });

  it("never lets image or document uploads take a workbook", async () => {
    const book = await realXlsx();
    expect(detectImage(book)).toBeNull();
    expect(detectDocument(book)).toBeNull();
  });

  it("downloads workbooks instead of showing them inline", () => {
    expect(mimeForFileId("0f8fad5b-d9cb-469f-a165-70867728950e.xlsx")).toBe(XLSX_MIME);
    expect(contentDispositionForFileId("0f8fad5b-d9cb-469f-a165-70867728950e.xlsx")).toBe("attachment");
    expect(contentDispositionForFileId("0f8fad5b-d9cb-469f-a165-70867728950e.pdf")).toBe("inline");
    expect(contentDispositionForFileId("0f8fad5b-d9cb-469f-a165-70867728950e.jpg")).toBe("inline");
  });
});

describe("isFileId", () => {
  it("only accepts generated ids, never paths", () => {
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.jpg")).toBe(true);
    expect(isFileId("../db.json")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.svg")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.pdf")).toBe(true);
    expect(isFileId("x/0f8fad5b-d9cb-469f-a165-70867728950e.jpg")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.xlsx")).toBe(true);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.xls")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.xlsm")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.xlsx/../db.json")).toBe(false);
  });
});

describe("LocalFileStore", () => {
  let dir: string;
  let store: LocalFileStore;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "weddinas-files-"));
    store = new LocalFileStore(dir);
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("saves an image per couple, reads it back and deletes it", async () => {
    const id = await store.saveImage("couple-1", jpeg);
    expect(isFileId(id)).toBe(true);
    expect(await store.read("couple-1", id)).toEqual({ bytes: jpeg, mime: "image/jpeg" });
    expect(await store.read("couple-2", id)).toBeNull();

    await store.delete("couple-1", id);
    expect(await store.read("couple-1", id)).toBeNull();
  });

  it("refuses non-images, oversized files and unsafe couple ids", async () => {
    await expect(store.saveImage("couple-1", Buffer.from("hello"))).rejects.toThrow("image");
    await expect(store.saveImage("couple-1", Buffer.concat([jpeg, Buffer.alloc(MAX_IMAGE_BYTES)]))).rejects.toThrow("large");
    await expect(store.saveImage("../evil", jpeg)).rejects.toThrow();
    expect(await store.read("couple-1", "../../etc/passwd")).toBeNull();
  });

  it("saves documents (PDF or image) up to 10 MB, refusing anything else", async () => {
    const id = await store.saveDocument("couple-1", pdf);
    expect(id).toMatch(/\.pdf$/);
    expect(await store.read("couple-1", id)).toEqual({ bytes: pdf, mime: "application/pdf" });
    await expect(store.saveDocument("couple-1", Buffer.from("<html>"))).rejects.toThrow("supported");
    await expect(store.saveDocument("couple-1", Buffer.concat([pdf, Buffer.alloc(MAX_DOCUMENT_BYTES)]))).rejects.toThrow("large");
    await expect(store.saveImage("couple-1", pdf)).rejects.toThrow("image");
  });

  it("keeps saving PNG and WebP images and documents", async () => {
    expect(await store.read("couple-1", await store.saveImage("couple-1", png))).toEqual({ bytes: png, mime: "image/png" });
    expect(await store.read("couple-1", await store.saveImage("couple-1", webp))).toEqual({ bytes: webp, mime: "image/webp" });
    expect(await store.saveDocument("couple-1", jpeg)).toMatch(/\.jpg$/);
  });

  it("saves workbooks only through the spreadsheet flow, up to 5 MB", async () => {
    const book = await realXlsx();
    const id = await store.saveSpreadsheet("couple-1", book);
    expect(id).toMatch(/\.xlsx$/);
    expect(isFileId(id)).toBe(true);
    expect(await store.read("couple-1", id)).toEqual({ bytes: book, mime: XLSX_MIME });
    expect(MAX_SPREADSHEET_BYTES).toBe(5 * 1024 * 1024);

    await expect(store.saveImage("couple-1", book)).rejects.toThrow("image");
    await expect(store.saveDocument("couple-1", book)).rejects.toThrow("supported");
    await expect(store.saveSpreadsheet("couple-1", pdf)).rejects.toThrow("spreadsheet");
    await expect(store.saveSpreadsheet("couple-1", png)).rejects.toThrow("spreadsheet");
    await expect(store.saveSpreadsheet("couple-1", zip(["word/document.xml"]))).rejects.toThrow("spreadsheet");
    await expect(store.saveSpreadsheet("couple-1", Buffer.concat([book, Buffer.alloc(MAX_SPREADSHEET_BYTES)]))).rejects.toThrow("large");
    await expect(store.saveSpreadsheet("../evil", book)).rejects.toThrow();
  });

  it("keeps images attached as documents at 5 MB", async () => {
    await expect(store.saveDocument("couple-1", Buffer.concat([jpeg, Buffer.alloc(MAX_IMAGE_BYTES)]))).rejects.toThrow("large");
  });
});
