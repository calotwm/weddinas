import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { CellValue, GridSheet } from "./comparison-table";
import { GUEST_IMPORT_LIMITS, GuestImportError, parseGuestFile, parseGuestGrid } from "./guest-import";

const HEADER: CellValue[] = ["N", "APELLIDO", "NOMBRE", "EDAD ", "RSVP", "MESA", "MENÚ", "COMBI", "MUSICA", "MENSAJE", "RELACIÓN", "INVITADO", "VIAJA", "TELEFONO"];
const sheet = (rows: CellValue[][], name = "Lista"): GridSheet => ({ name, rows, merges: [] });
const NO_COLUMNS = "No encontramos las columnas APELLIDO y NOMBRE en el Excel.";

/** The agency's layout: a summary block above the header row. */
const summaryBlock: CellValue[][] = [
  [],
  [null, "FORMULA AUTOMÁTICA. NO TOCAR"],
  [null, "Composición invitados", null, null, "Invitados por mesa"],
  [null, "Adulto", 2, null, "PRINCIPAL", 0],
  [null, "Confirmaciones"],
  [null, "Si", 1],
];

describe("parseGuestGrid", () => {
  it("finds the header row below a summary block and maps every column", () => {
    const guests = parseGuestGrid([
      sheet([
        ...summaryBlock,
        HEADER,
        [1, "Pérez", "Ana", "Adulto", "Si", 3, "Celíaco", "Si (ida y vuelta)", "Un tema", "Felicidades", "Familia", "Anita", "Si", "11 5555-5555"],
        [2, "Gómez", "Juan", "Teen", "No", "PRINCIPAL", "Sin restriccion", "No", null, null, "Amigos", "Fran", "No", 1155556666],
      ]),
    ]);
    expect(guests).toEqual([
      {
        lastName: "Pérez",
        name: "Ana",
        age: "adult",
        status: "confirmed",
        table: "3",
        restriction: "Celíaco",
        transport: "Si (ida y vuelta)",
        group: "Familia",
        side: "Anita",
        travels: true,
        phone: "11 5555-5555",
      },
      {
        lastName: "Gómez",
        name: "Juan",
        age: "teen",
        status: "declined",
        table: "PRINCIPAL",
        restriction: "Sin restriccion",
        transport: "No",
        group: "Amigos",
        side: "Fran",
        travels: false,
        phone: "1155556666",
      },
    ]);
  });

  it("matches header labels ignoring accents, case and spaces, in any column order", () => {
    const guests = parseGuestGrid([sheet([[" nombre", "Apellído ", "Menu", "Relacion", "Telé fono"], ["Ana", "Pérez", "Vegano", "Amigos", "123"]])]);
    expect(guests).toEqual([{ name: "Ana", lastName: "Pérez", restriction: "Vegano", group: "Amigos", phone: "123", status: "pending" }]);
  });

  it("maps every age and RSVP value; unknown or blank ones stay empty and pending", () => {
    const rows: CellValue[][] = [
      ["APELLIDO", "NOMBRE", "EDAD", "RSVP"],
      ["A", "1", "Adulto", "Si"],
      ["A", "2", "teen", "SI"],
      ["A", "3", "Niño", "No"],
      ["A", "4", "Bebe", "Enviado"],
      ["A", "5", "Bebé", null],
      ["A", "6", "Abuelo", "Quizás"],
      ["A", "7", null, "Sí"],
    ];
    const guests = parseGuestGrid([sheet(rows)]);
    expect(guests.map((g) => [g.name, g.age, g.status])).toEqual([
      ["1", "adult", "confirmed"],
      ["2", "teen", "confirmed"],
      ["3", "child", "declined"],
      ["4", "baby", "sent"],
      ["5", "baby", "pending"],
      ["6", undefined, "pending"],
      ["7", undefined, "confirmed"],
    ]);
  });

  it("writes table numbers without decimals and drops lone dashes", () => {
    const guests = parseGuestGrid([sheet([["APELLIDO", "NOMBRE", "MESA", "RELACIÓN", "VIAJA"], ["Pérez", "Ana", 12.0, "-", "-"], ["Ruiz", "Sofi", 2.5, " ", null]])]);
    expect(guests).toEqual([
      { lastName: "Pérez", name: "Ana", table: "12", status: "pending" },
      { lastName: "Ruiz", name: "Sofi", table: "2.5", status: "pending" },
    ]);
  });

  it("skips rows without last name and name, and uses the last name alone as the name", () => {
    const guests = parseGuestGrid([sheet([["N", "APELLIDO", "NOMBRE", "EDAD"], [1, null, null, "Adulto"], [], [2, "Familia Ruiz", null], [3, null, "Sofi"]])]);
    expect(guests).toEqual([
      { name: "Familia Ruiz", status: "pending" },
      { name: "Sofi", status: "pending" },
    ]);
  });

  it("ignores MUSICA, MENSAJE, N and unknown columns", () => {
    const guests = parseGuestGrid([sheet([["N", "APELLIDO", "NOMBRE", "MUSICA", "MENSAJE", "OTRA"], [7, "Pérez", "Ana", "Tema", "Hola", "x"]])]);
    expect(guests).toEqual([{ lastName: "Pérez", name: "Ana", status: "pending" }]);
  });

  it("uses the first sheet that has the header", () => {
    const guests = parseGuestGrid([sheet([["Resumen"], [1, 2]], "Resumen"), sheet([["APELLIDO", "NOMBRE"], ["Pérez", "Ana"]]), sheet([["APELLIDO", "NOMBRE"], ["Otro", "No"]], "Copia")]);
    expect(guests.map((g) => g.name)).toEqual(["Ana"]);
  });

  it("fails with a message when no header has APELLIDO and NOMBRE in the first rows", () => {
    expect(() => parseGuestGrid([sheet([["APELLIDO", "EDAD"], ["Pérez", "Adulto"]])])).toThrow(new GuestImportError(NO_COLUMNS));
    const late = [...Array.from({ length: GUEST_IMPORT_LIMITS.headerRows }, () => ["x"]), ["APELLIDO", "NOMBRE"], ["Pérez", "Ana"]];
    expect(() => parseGuestGrid([sheet(late)])).toThrow(NO_COLUMNS);
    expect(() => parseGuestGrid([])).toThrow(NO_COLUMNS);
  });

  it("fails when the header has no guests under it", () => {
    expect(() => parseGuestGrid([sheet([["APELLIDO", "NOMBRE"], [null, null]])])).toThrow("No encontramos invitados debajo de APELLIDO y NOMBRE.");
  });

  it("caps the list at 1000 guests", () => {
    const rows: CellValue[][] = [["APELLIDO", "NOMBRE"], ...Array.from({ length: GUEST_IMPORT_LIMITS.guests }, (_, i) => ["A", `G${i}`])];
    expect(parseGuestGrid([sheet(rows)])).toHaveLength(1000);
    expect(() => parseGuestGrid([sheet([...rows, ["A", "extra"]])])).toThrow("El Excel tiene más de 1000 invitados.");
  });

  it("trims long values to the form limits", () => {
    const [g] = parseGuestGrid([sheet([["APELLIDO", "NOMBRE", "MESA"], ["P".repeat(200), "N".repeat(200), "M".repeat(100)]])]);
    expect([g.lastName?.length, g.name.length, g.table?.length]).toEqual([80, 120, 40]);
  });
});

describe("parseGuestFile", () => {
  const xlsx = async (rows: CellValue[][]) => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Lista").addRows(rows);
    return new Uint8Array(await workbook.xlsx.writeBuffer());
  };

  it("reads a real xlsx file", async () => {
    const bytes = await xlsx([["Resumen"], HEADER, [1, "Pérez", "Ana", "Adulto", "Enviado", 4]]);
    expect(await parseGuestFile("Lista de invitados.xlsx", bytes)).toEqual([{ lastName: "Pérez", name: "Ana", age: "adult", status: "sent", table: "4" }]);
  });

  it("rejects other formats, big files and broken files with a message", async () => {
    await expect(parseGuestFile("lista.csv", new Uint8Array([1]))).rejects.toThrow("Subí la lista en formato .xlsx (Excel).");
    await expect(parseGuestFile("lista.xlsx", new Uint8Array(GUEST_IMPORT_LIMITS.maxBytes + 1))).rejects.toThrow("La lista pesa más de 5 MB.");
    await expect(parseGuestFile("lista.xlsx", new Uint8Array([1, 2, 3]))).rejects.toThrow("El archivo no es un .xlsx válido.");
    await expect(parseGuestFile("lista.xlsx", new Uint8Array([0x50, 0x4b, 3, 4]))).rejects.toThrow("No pudimos leer la lista");
  });
});
