import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  COMPARISON_LIMITS,
  ComparisonTableError,
  parseComparisonFile,
  parseComparisonGrid,
  parseRange,
  type CellValue,
  type GridSheet,
} from "./comparison-table";

const meta = { fileName: "Cuadro.xlsx", uploadedAt: "2026-11-11T12:00:00.000Z" };
const sheet = (rows: CellValue[][], merges: string[] = [], name = "Hoja 1"): GridSheet => ({ name, rows, merges: merges.map(parseRange) });
const parse = (...sheets: GridSheet[]) => parseComparisonGrid(sheets, meta);
const NO_VENDORS = "No encontramos proveedores en el cuadro. Revisá que la primera columna tenga los nombres.";

describe("parseRange", () => {
  it("turns an A1 range into 0-based inclusive bounds", () => {
    expect(parseRange("B3:AA12")).toEqual({ top: 2, left: 1, bottom: 11, right: 26 });
    expect(parseRange("C4")).toEqual({ top: 3, left: 2, bottom: 3, right: 2 });
  });
});

describe("parseComparisonGrid", () => {
  it("reads the header row and one vendor per row", () => {
    const table = parse(
      sheet([
        ["Combis", "Combi X hs", "Total"],
        ["Viajes Sur", "4 hs", 250000],
        ["Traslados Ya", "5 hs", 310000],
      ]),
    );
    expect(table).toEqual({
      ...meta,
      sheets: [
        {
          name: "Hoja 1",
          columns: ["Combis", "Combi X hs", "Total"],
          vendors: [
            { name: "Viajes Sur", rows: [["4 hs", "$ 250.000"]] },
            { name: "Traslados Ya", rows: [["5 hs", "$ 310.000"]] },
          ],
        },
      ],
    });
  });

  it("labels an empty vendor header cell as Proveedor", () => {
    const table = parse(sheet([[null, "Entrada", "Ceremonia"], ["Flores Lu", "Arco", "Pétalos"]]));
    expect(table.sheets[0].columns).toEqual(["Proveedor", "Entrada", "Ceremonia"]);
  });

  it("ignores everything from the first empty header column on (side cells like DOLAR HOY)", () => {
    const table = parse(
      sheet([
        ["Dj", "Viaticos", "Total $", null, "DOLAR HOY", 1210],
        ["Dj Uno", "Incluidos", 900000, null, "*Buscar en dólarhoy.com", 5],
      ]),
    );
    expect(table.sheets[0].columns).toEqual(["Dj", "Viaticos", "Total $"]);
    expect(table.sheets[0].vendors[0].rows).toEqual([["Incluidos", "$ 900.000"]]);
  });

  it("flattens a second header row under horizontally merged group headers", () => {
    const table = parse(
      sheet(
        [
          [null, "Dj", null, "Ceremonia", null, "Total $", "Método de pago"],
          [null, "Producto", "Valor", "Producto", "Valor", null, null],
          ["Sonido Max", "Dj: Kevin", "Incluido", "Sonido\nceremonia", 1900000, 19700000, "Seña\n30%"],
        ],
        ["A1:A2", "B1:C1", "D1:E1", "F1:F2", "G1:G2"],
      ),
    );
    expect(table.sheets[0].columns).toEqual([
      "Proveedor",
      "Dj · Producto",
      "Dj · Valor",
      "Ceremonia · Producto",
      "Ceremonia · Valor",
      "Total $",
      "Método de pago",
    ]);
    expect(table.sheets[0].vendors[0].rows).toEqual([["Dj: Kevin", "Incluido", "Sonido\nceremonia", "$ 1.900.000", "$ 19.700.000", "Seña\n30%"]]);
  });

  it("treats vertically merged header cells as a two-row header even when row 2 is blank", () => {
    const table = parse(
      sheet(
        [
          ["Maquilladora", "Ceremonia", "Total $"],
          [null, null, null],
          ["Make Up Co", "Novia", 150000],
        ],
        ["A1:A2", "B1:B2", "C1:C2"],
      ),
    );
    expect(table.sheets[0].columns).toEqual(["Maquilladora", "Ceremonia", "Total $"]);
    expect(table.sheets[0].vendors).toEqual([{ name: "Make Up Co", rows: [["Novia", "$ 150.000"]] }]);
  });

  it("groups the rows of a vertically merged vendor cell and of empty-vendor continuation rows", () => {
    const table = parse(
      sheet(
        [
          ["Catering", "Formato", "Precio x persona"],
          ["Cocina Uno", "Cóctel", 45000],
          [null, "Mesa", 52000],
          [null, null, null],
          ["Cocina Dos", "Cóctel", 41000],
          [null, "Asado", 39000],
          [null, null, null],
          [null, null, null],
        ],
        ["A2:A4", "A5:A6"],
      ),
    );
    expect(table.sheets[0].vendors).toEqual([
      { name: "Cocina Uno", rows: [["Cóctel", "$ 45.000"], ["Mesa", "$ 52.000"]] },
      { name: "Cocina Dos", rows: [["Cóctel", "$ 41.000"], ["Asado", "$ 39.000"]] },
    ]);
  });

  it("shows a vertically merged data cell once, on its first row", () => {
    const table = parse(
      sheet(
        [
          ["Dj", "Equipo", "Total"],
          ["Dj Uno", "Cabina", 1000000],
          [null, "Escenario", 1000000],
        ],
        ["A2:A3", "C2:C3"],
      ),
    );
    expect(table.sheets[0].vendors[0].rows).toEqual([["Cabina", "$ 1.000.000"], ["Escenario", ""]]);
  });

  it("keeps a full-width merged row as the group of the vendors under it", () => {
    const table = parse(
      sheet(
        [
          [null, "Camaras", "Valor Total (USD)"],
          ["Foto", null, null],
          ["Estudio A", "2", 2500],
          ["Video", null, null],
          ["Films B", "3", 3100.6],
        ],
        ["A2:C2", "A4:C4"],
      ),
    );
    expect(table.sheets[0].vendors).toEqual([
      { name: "Estudio A", group: "Foto", rows: [["2", "USD 2.500"]] },
      { name: "Films B", group: "Video", rows: [["3", "USD 3.101"]] },
    ]);
  });

  it("formats numbers by column: pesos from 1000 on, USD without decimals, others plain", () => {
    const table = parse(
      sheet([
        ["Proveedor", "Valor", "Valor en USD", "Cant pisos", "Precio x PAX", "Valor en dolares"],
        ["Torta Rica", 999, 1234.4, 3, 12500.5, 80],
      ]),
    );
    expect(table.sheets[0].vendors[0].rows[0]).toEqual(["999", "USD 1.234", "3", "$ 12.501", "USD 80"]);
  });

  it("drops rows without a vendor name and fails on an empty template", () => {
    const template = sheet(
      [
        ["Catering", "Formato", "Total final", null, "DOLAR HOY"],
        [null, null, 0, null, null],
        [null, null, null, null, "*Buscar en dólarhoy.com"],
      ],
      ["A2:A4"],
    );
    expect(() => parse(template)).toThrow(ComparisonTableError);
    expect(() => parse(template)).toThrow(NO_VENDORS);
  });

  it("turns every sheet with vendors into a section and skips empty ones", () => {
    const table = parse(
      sheet([["Dj", "Total"], ["Dj Uno", 100000]], [], "PROPUESTAS INICIALES"),
      sheet([[null, "Ceremonia"]], [], "Fotos"),
      sheet([["Dj", "Total"], ["Dj Uno", 120000]], [], "PROPUESTA ACTUALIZADA"),
    );
    expect(table.sheets.map((s) => s.name)).toEqual(["PROPUESTAS INICIALES", "PROPUESTA ACTUALIZADA"]);
  });

  it("rejects too many sheets, columns or rows", () => {
    const one = sheet([["Dj", "Total"], ["Dj Uno", 1]]);
    expect(() => parse(...Array.from({ length: COMPARISON_LIMITS.sheets + 1 }, () => one))).toThrow(/hojas/);
    const wide = [Array.from({ length: COMPARISON_LIMITS.columns + 1 }, (_, i) => `Col ${i}`), ["Dj Uno"]];
    expect(() => parse(sheet(wide))).toThrow(/columnas/);
    const long = [["Dj", "Total"], ...Array.from({ length: COMPARISON_LIMITS.rows + 1 }, (_, i) => [`Dj ${i}`, i])];
    expect(() => parse(sheet(long))).toThrow(/filas/);
  });
});

describe("parseComparisonFile", () => {
  async function xlsx(build: (wb: ExcelJS.Workbook) => void): Promise<Uint8Array> {
    const wb = new ExcelJS.Workbook();
    build(wb);
    return new Uint8Array(await wb.xlsx.writeBuffer());
  }

  it("reads an xlsx with merges, formulas, rich text and hidden sheets", async () => {
    const bytes = await xlsx((wb) => {
      const ws = wb.addWorksheet("Dj y Técnica");
      ws.addRow([null, "Dj", null, "Total $", null, "DOLAR HOY", 1210]);
      ws.addRow([null, "Producto", "Valor"]);
      ws.addRow(["Sonido Max", "Cabina", 600000, { formula: "C3+C4", result: 1600000 }]);
      ws.addRow([null, { richText: [{ text: "Escenario " }, { text: "LED" }] }, 1000000]);
      ws.addRow([null, { text: "Ver catálogo", hyperlink: "https://example.com" }, null]);
      ws.mergeCells("A1:A2");
      ws.mergeCells("B1:C1");
      ws.mergeCells("D1:D2");
      ws.mergeCells("A3:A4");
      ws.mergeCells("D3:D4");
      const hidden = wb.addWorksheet("Interno");
      hidden.addRow(["Dj", "Total"]);
      hidden.addRow(["Oculto", 1]);
      hidden.state = "hidden";
    });
    const table = await parseComparisonFile("cuadro.xlsx", bytes, meta.uploadedAt);
    expect(table).toEqual({
      fileName: "cuadro.xlsx",
      uploadedAt: meta.uploadedAt,
      sheets: [
        {
          name: "Dj y Técnica",
          columns: ["Proveedor", "Dj · Producto", "Dj · Valor", "Total $"],
          vendors: [{ name: "Sonido Max", rows: [["Cabina", "$ 600.000", "$ 1.600.000"], ["Escenario LED", "$ 1.000.000", ""], ["Ver catálogo", "", ""]] }],
        },
      ],
    });
  });

  it("rejects files that are not xlsx, too large, or unreadable", async () => {
    await expect(parseComparisonFile("cuadro.pdf", new Uint8Array([0x50, 0x4b, 3, 4]), meta.uploadedAt)).rejects.toThrow(/\.xlsx/);
    await expect(parseComparisonFile("cuadro.xlsx", new Uint8Array(COMPARISON_LIMITS.maxBytes + 1), meta.uploadedAt)).rejects.toThrow(/5 MB/);
    await expect(parseComparisonFile("cuadro.xlsx", new TextEncoder().encode("%PDF-1.4"), meta.uploadedAt)).rejects.toThrow(ComparisonTableError);
    await expect(parseComparisonFile("cuadro.xlsx", new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]), meta.uploadedAt)).rejects.toThrow(ComparisonTableError);
  });

  it("fails with the vendor message on an empty model", async () => {
    const bytes = await xlsx((wb) => wb.addWorksheet("Catering").addRow(["Catering", "Formato", "Total final"]));
    await expect(parseComparisonFile("cuadro.xlsx", bytes, meta.uploadedAt)).rejects.toThrow(NO_VENDORS);
  });
});
