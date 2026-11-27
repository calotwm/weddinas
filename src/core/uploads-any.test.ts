import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { LocalFileStore } from "@/infra/local-file-store";
import { contentDispositionForFileId, detectFile, isFileId, mimeForFileId } from "./uploads";

const zipWith = async (entry: string) => {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file(entry, "<x/>");
  return new Uint8Array(await zip.generateAsync({ type: "uint8array" }));
};
const ole = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64)]);

describe("any file type (phase 10 S1)", () => {
  it("recognizes Word, Excel and PowerPoint, new and old, plus CSV and text, besides PDFs and images", async () => {
    expect(detectFile(await zipWith("word/document.xml"), "Plano.docx")?.ext).toBe("docx");
    expect(detectFile(await zipWith("xl/workbook.xml"), "Plano.xlsx")?.ext).toBe("xlsx");
    expect(detectFile(await zipWith("ppt/presentation.xml"), "x.pptx")?.ext).toBe("pptx");
    expect(detectFile(ole, "viejo.doc")?.ext).toBe("doc");
    expect(detectFile(ole, "viejo.XLS")?.ext).toBe("xls");
    expect(detectFile(ole, "viejo.ppt")?.ext).toBe("ppt");
    expect(detectFile(Buffer.from("Mesa;Invitado\n1;Ana\n"), "mesas.csv")?.ext).toBe("csv");
    expect(detectFile(Buffer.from("notas"), "notas.txt")?.ext).toBe("txt");
    expect(detectFile(Buffer.from("%PDF-1.7\n"), "a.pdf")?.ext).toBe("pdf");
  });

  it("rejects HTML, SVG, scripts, binaries and unknown zips whatever their name says", async () => {
    expect(detectFile(Buffer.from("<html><script>x</script>"), "a.txt")).toBeNull();
    expect(detectFile(Buffer.from("<svg onload=alert(1)>"), "a.csv")).toBeNull();
    expect(detectFile(Buffer.from([0x4d, 0x5a, 0x90, 0, 3]), "a.txt")).toBeNull();
    expect(detectFile(Buffer.from("hola"), "a.html")).toBeNull();
    expect(detectFile(await zipWith("other.xml"), "a.docx")).toBeNull();
    expect(detectFile(ole, "a.exe")).toBeNull();
  });

  it("downloads everything but images and PDFs, which open in the browser", () => {
    const id = (ext: string) => `00000000-0000-4000-8000-000000000001.${ext}`;
    for (const ext of ["docx", "doc", "xlsx", "xls", "pptx", "ppt", "csv", "txt"]) {
      expect(isFileId(id(ext))).toBe(true);
      expect(contentDispositionForFileId(id(ext))).toBe("attachment");
    }
    expect(contentDispositionForFileId(id("pdf"))).toBe("inline");
    expect(contentDispositionForFileId(id("png"))).toBe("inline");
    expect(mimeForFileId(id("txt"))).toBe("text/plain; charset=utf-8");
  });

  it("stores any supported document with its type, and still rejects the rest", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "weddinas-any-"));
    try {
      const store = new LocalFileStore(dir);
      expect(await store.saveDocument("c1", await zipWith("word/document.xml"), "Plano ceremonia.docx")).toMatch(/\.docx$/);
      expect(await store.saveDocument("c1", Buffer.from("%PDF-1.7\n"))).toMatch(/\.pdf$/);
      await expect(store.saveDocument("c1", Buffer.from("<html>"), "a.txt")).rejects.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
