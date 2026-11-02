import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectDocument, detectImage, isFileId, MAX_DOCUMENT_BYTES, MAX_IMAGE_BYTES } from "./uploads";
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

describe("isFileId", () => {
  it("only accepts generated ids, never paths", () => {
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.jpg")).toBe(true);
    expect(isFileId("../db.json")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.svg")).toBe(false);
    expect(isFileId("0f8fad5b-d9cb-469f-a165-70867728950e.pdf")).toBe(true);
    expect(isFileId("x/0f8fad5b-d9cb-469f-a165-70867728950e.jpg")).toBe(false);
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

  it("keeps images attached as documents at 5 MB", async () => {
    await expect(store.saveDocument("couple-1", Buffer.concat([jpeg, Buffer.alloc(MAX_IMAGE_BYTES)]))).rejects.toThrow("large");
  });
});
