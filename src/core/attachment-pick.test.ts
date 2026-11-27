import { describe, expect, it } from "vitest";
import { attachmentPickProblem, ATTACHMENT_MAX_FILES } from "./attachment-pick";

const MB = 1024 * 1024;
const file = (name: string, size: number, type = "") => ({ name, size, type });

describe("attachmentPickProblem", () => {
  it("accepts PDFs and images within their limits", () => {
    expect(attachmentPickProblem([file("presupuesto.pdf", 19 * MB, "application/pdf"), file("foto.JPG", 1 * MB, "image/jpeg")])).toBeNull();
  });

  it("asks for a file when none was picked", () => {
    expect(attachmentPickProblem([])).toBe("Elegí al menos un archivo.");
  });

  it("caps how many files go at once", () => {
    const many = Array.from({ length: ATTACHMENT_MAX_FILES + 1 }, (_, i) => file(`f${i}.pdf`, 10, "application/pdf"));
    expect(attachmentPickProblem(many)).toBe(`Subí hasta ${ATTACHMENT_MAX_FILES} archivos por vez.`);
  });

  it("names each file of a type the server does not take, with a hint for iPhone photos", () => {
    // Phase 10: Word, Excel and the other Office files are taken.
    expect(attachmentPickProblem([file("contrato.docx", 10), file("plano.xlsx", 10)])).toBeNull();
    expect(attachmentPickProblem([file("app.exe", 10), file("IMG_1.HEIC", 10, "image/heic")])).toBe(
      "No se pueden subir: app.exe (solo PDF, imágenes (JPG, PNG, WebP), Word, Excel, PowerPoint, CSV o texto), IMG_1.HEIC (foto de iPhone: guardala como JPG).",
    );
  });

  it("names images over 5 MB and PDFs over 20 MB", () => {
    expect(attachmentPickProblem([file("foto.png", 6 * MB, "image/png"), file("menu.pdf", 20.5 * MB, "application/pdf")])).toBe(
      "No se pueden subir: foto.png (las imágenes van hasta 5 MB), menu.pdf (los archivos van hasta 20 MB).",
    );
  });

  it("stops a pick heavier than one upload can carry", () => {
    // Two 15 MB PDFs (the agency's usual vendor quotes) go together; three do not.
    expect(attachmentPickProblem([file("a.pdf", 15 * MB, "application/pdf"), file("b.pdf", 15 * MB, "application/pdf")])).toBeNull();
    expect(attachmentPickProblem([1, 2, 3].map((n) => file(`${n}.pdf`, 15 * MB, "application/pdf")))).toBe(
      "Entre todos pesan más de 40 MB. Subilos en partes.",
    );
  });

  it("goes by the extension when the browser gives no type", () => {
    expect(attachmentPickProblem([file("scan.pdf", 10), file("foto.webp", 10)])).toBeNull();
  });
});
