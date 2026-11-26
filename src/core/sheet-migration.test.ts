import { describe, expect, it } from "vitest";
import type { CellValue, GridSheet } from "./comparison-table";
import { migrateCouple, type CoupleSheets } from "./sheet-migration";

// Every fixture below is invented: no real couple, vendor, phone or amount.
const sheet = (name: string, rows: CellValue[][]): GridSheet => ({ name, rows, merges: [] });
const _ = null;

const generalData = (overrides: { names?: CellValue[]; fecha?: CellValue; hora?: CellValue } = {}) =>
  sheet("Datos generales", [
    [_, "Datos", "Novia", "Novio", _, "Civil", "Detalle", "Aclaraciones", _, "Ideas generales"],
    overrides.names ?? [_, "Nombres", "Lola", "Tomás", _, "Fecha", "-", _, _, "Boda de campo"],
    [_, "Mamá", "Ana", "-", _, "Registro civil", "Centro", "Turno a pedir", _, "Con fogón"],
    [],
    [_, "Información del evento", "Detalle", "Aclaraciones"],
    [_, "Fecha", overrides.fecha === undefined ? "05/03/27" : overrides.fecha],
    [_, "Hora", overrides.hora === undefined ? "8 a 3 hs" : overrides.hora],
    [_, "Lugar", "Quinta Uno"],
  ]);

const couple = (sheets: CoupleSheets["sheets"], extra: Partial<CoupleSheets> = {}): CoupleSheets => ({
  name: "Lola y Tomás",
  year: 2027,
  today: "2026-11-16",
  sheets: { brief: [generalData()], ...sheets },
  ...extra,
});

describe("migrateCouple: couple and wedding date", () => {
  it("takes the names from the Nombres row and the date, first hour and venue from the event block", () => {
    const { data, warnings } = migrateCouple(couple({}));
    expect(data).toMatchObject({ partnerA: "Lola", partnerB: "Tomás", weddingDate: "2027-03-05T20:00", venue: "Quinta Uno", ideas: "Boda de campo\nCon fogón" });
    expect(warnings).toEqual([]);
  });

  it("falls back to the PDF name, reads long dates and defaults the hour to 18:00", () => {
    const brief = [generalData({ names: [_, "Nombres", "-", "-"], fecha: "9 de octubre 2027", hora: "" })];
    expect(migrateCouple(couple({ brief })).data).toMatchObject({ partnerA: "Lola", partnerB: "Tomás", weddingDate: "2027-10-09T18:00" });
    expect(migrateCouple(couple({ brief: [generalData({ fecha: "20/02/2027", hora: "16:30 a 02:30" })] })).data?.weddingDate).toBe("2027-02-20T16:30");
  });

  it("reports a couple without a wedding date and does not build it", () => {
    const { data, warnings } = migrateCouple(couple({ brief: [generalData({ fecha: "" })] }));
    expect(data).toBeNull();
    expect(warnings).toContain("Sin fecha de casamiento en el brief: la pareja no se importa.");
  });
});

describe("migrateCouple: brief blocks", () => {
  const extras = sheet("Extras", [
    [_, "ANA", _, _, _, "BEA"],
    [_, "Ramos", "Detalle", "Aclaraciones", _, "Maquillaje y peinado", "Detalle", "Aclaraciones"],
    [_, "Proveedor", "Flores Uno", "Confirmado por mail", _, "Proveedor", "Make Dos", _],
    [_, "Pago", "100%", "$ 10", _, "Pago", "-%", _],
    [_, "Civil", "No", _, _, "Prueba", "Pendiente", _],
    [_, _, "Ver con la novia", "Segunda línea", _, "Acompañantes", "-", _],
    [_, _, _, _, _, "Equipo", "Caro", _],
    [_, "Fuegos artificiales", "Detalle", "Aclaraciones", _, "Look novio", "Detalle", "Aclaraciones"],
    [_, "Proveedor", "No", _, _, "Traje", "A medida", _],
    [_, "Momento", "Salida", _],
    [],
    [_, "Show recepción", "Detalle", "Aclaraciones", _, "Combis", "Detalle", "Aclaraciones"],
    [_, "Proveedor", _, _, _, "Recorrido", "-", _],
  ]);
  const barra = sheet("Barra de tragos", [
    [_, "Barra de tragos", "Detalle", "Aclaraciones", "Extra"],
    [_, "Proveedor", "Barra Tres", _],
    [_, "Tragos clasicos", "Gin tonic", "Sin pepino", "Nota al costado"],
    [_, "Mesa de quesos", "Sí", _],
    [_, "Equipo", "No", _],
  ]);

  const brief = (key: string) => migrateCouple(couple({ brief: [generalData(), extras, barra] })).data!.brief!.find((b) => b.key === key);

  it("reads side-by-side blocks with the owner row above them, continuation rows and skipped Pago rows", () => {
    expect(brief("ramo")).toEqual({
      key: "ramo",
      vendor: "Flores Uno",
      contact: "",
      status: "confirmed",
      owner: "ANA",
      fields: [
        { label: "Proveedor", detail: "Flores Uno", note: "Confirmado por mail" },
        { label: "Civil", detail: "No\nVer con la novia", note: "Segunda línea" },
      ],
    });
    expect(brief("maquillaje")).toMatchObject({ vendor: "Make Dos", status: "deciding", owner: "Caro", fields: [{ label: "Prueba", detail: "Pendiente", note: "" }] });
    expect(brief("look-novio")).toMatchObject({ vendor: "", status: "searching", owner: "BEA", fields: [{ label: "Traje", detail: "A medida" }] });
  });

  it("maps labels to catalog fields, keeps unknown labels as extra fields and side notes, and turns unknown titles into custom rubros", () => {
    expect(brief("barra")).toMatchObject({
      vendor: "Barra Tres",
      owner: "",
      fields: [
        { label: "Tragos clásicos", detail: "Gin tonic", note: "Sin pepino\nNota al costado" },
        { label: "Mesa de quesos", detail: "Sí", note: "" },
      ],
    });
    const { data } = migrateCouple(couple({ brief: [generalData(), extras] }));
    expect(data!.customRubros).toEqual(["Fuegos artificiales"]);
    expect(brief("custom-fuegos-artificiales")).toMatchObject({ vendor: "", status: "na", fields: [{ label: "Momento", detail: "Salida" }] });
    expect(brief("civil")).toMatchObject({ status: "deciding", fields: [{ label: "Registro civil", detail: "Centro", note: "Turno a pedir" }] });
  });

  it("leaves out empty template blocks, and their custom rubros", () => {
    const { data } = migrateCouple(couple({ brief: [generalData(), extras] }));
    expect(data!.brief!.map((b) => b.key)).not.toContain("combis");
    expect(data!.brief!.map((b) => b.key)).not.toContain("custom-show-recepcion");
    expect(data!.customRubros).not.toContain("Show recepción");

    const juegos = sheet("Extras Pau", [[_, "Juegos", "Detalle", "Aclaraciones"], [_, "Proveedor", "Si", _]]);
    const kept = migrateCouple(couple({ brief: [generalData(), juegos] })).data!.brief!.find((b) => b.key === "juegos");
    expect(kept).toMatchObject({ vendor: "", status: "deciding", fields: [{ label: "Proveedor", detail: "Si", note: "" }] });
  });
});

describe("migrateCouple: budget", () => {
  const summary = sheet("Presupuesto", [[_, "- Presupuesto -", _, _, _, _, "Invitados", 120]]);
  const fotoVideo = sheet("Foto y video", [
    [_, "Foto - Lente Uno\nVideo - Cine Dos"],
    [],
    [_, "Estimación de gastos"],
    [_, "Presupuesto", "AR$", "USD", "TC", "%", "Fecha de pago", "Obs"],
    [_, "Seña - Foto - Lente Uno", 150000, 100, 1500, "50%", "10/06/2026", "Congelado"],
    [_, "Saldo - Foto - Lente Uno", 160000, 100, 1600, "50%", _, "Congelado"],
    [_, "Pago total - Video - Cine Dos", 300000, 200.5, 1496, "100%", "02/07/2026", _],
    [_, "Total - Dron", _, 0, 1500, _, _, "VALOR ESTIMADO"],
    [_, "Total", 610000, 400.5],
    [_, "Seña - Video - Otro", 999, 1, 1, _, _, _],
  ]);
  const ambientacion = sheet("Ambientación", [
    [_, "Ambientación - Deco Tres"],
    [_, "Presupuesto", "AR$", "USD", "TC", "%", "Fecha de pago", "Obs"],
    [_, "Seña - Ambientacion", 500000, 333.33, 1500, "50%", "24/08/2026", "Congelado"],
    [_, "IVA Seña", 105000, 70, 1500, _, "24/08/2026", "IVA"],
    [_, "Saldo - Ambientacion", 500000, 312.5, 1600, "50%", "20/01/2027", "Se ajusta por IPC"],
  ]);
  const extras = sheet("EXTRAS", [
    ["WEDDING PLANNER", _, _, _, _, _, _, _, "CATERING"],
    ["PROVEEDOR ELEGIDO", "Plan Cuatro", _, _, _, _, _, _, "PROVEEDOR ELEGIDO", "Cocina Cinco"],
    ["CERRADO EN", "Dolares", _, _, _, _, _, _, "CERRADO EN", "Pesos"],
    ["CONCEPTO", "$", "USD", "TC", "%", "FECHA", "OBS", _, "CONCEPTO", "$", "USD", "TC", "%", "FECHA", "OBS"],
    ["FOTO", _, _, _, _, _, _, _, "Seña", 200000, 125, 1600, "30%", "01/09/2026", "Congelado"],
    ["Primer pago", 160000, 100.4, 1600, "50%", "01/10/2026", _, _, "Saldo", 400000, 250, 1600, "70%", "25/01/2027", _],
    ["Presupuesto inicial estimado", _, 900, 1600, _, _, _, _, "Presupuesto inicial estimado", 0, _, 1600],
    ["Total", _, _, _, "100%", _, _, _, "Total"],
  ]);

  const run = () => migrateCouple(couple({ presupuesto: [summary, fotoVideo, ambientacion, extras] }));

  it("groups rows per rubro and vendor, picks the currency and turns dated rows into payments", () => {
    const { data } = run();
    const items = data!.budget!.items;
    expect(data!.budget!.guests).toBe(120);
    expect(items.find((i) => i.category === "foto")).toEqual({
      category: "foto", vendor: "Lente Uno", concept: "Foto", amount: 200, currency: "USD", adjustment: "frozen", baseMonth: "2026-06", note: "",
      payments: [{ date: "2026-06-10", amount: 150000, currency: "ARS", arsPerUsd: 1500, kind: "sena", note: "Seña - Foto - Lente Uno" }],
    });
    expect(items.find((i) => i.category === "video")).toMatchObject({
      vendor: "Cine Dos", amount: 300000, currency: "ARS", baseMonth: "2026-07",
      payments: [{ date: "2026-07-02", amount: 300000, currency: "ARS", arsPerUsd: null, kind: "saldo" }],
    });
  });

  it("marks IPC from an unpaid row, keeps future dates as the due date and maps IVA payments", () => {
    const item = run().data!.budget!.items.find((i) => i.category === "ambientacion")!;
    expect(item).toMatchObject({ vendor: "Deco Tres", amount: 1105000, currency: "ARS", adjustment: "ipc", baseMonth: "2026-08", dueDate: "2027-01-20" });
    expect(item.payments!.map((p) => [p.kind, p.amount])).toEqual([["sena", 500000], ["iva", 105000]]);
  });

  it("reads the per-rubro template (PROVEEDOR ELEGIDO, CERRADO EN), custom rubros and skips estimates and zero rows", () => {
    const { data, warnings } = run();
    const items = data!.budget!.items;
    expect(items.find((i) => i.category === "catering")).toMatchObject({ vendor: "Cocina Cinco", currency: "ARS", amount: 600000, dueDate: "2027-01-25", payments: [{ amount: 200000, kind: "sena" }] });
    expect(items.find((i) => i.category === "custom-wedding-planner")).toMatchObject({
      vendor: "Plan Cuatro", concept: "Wedding planner", currency: "USD", amount: 100.4,
      payments: [{ amount: 160000, currency: "ARS", arsPerUsd: 1600, kind: "intermedio" }],
    });
    expect(data!.customRubros).toContain("Wedding planner");
    expect(items).toHaveLength(5);
    expect(warnings).toContain('Presupuesto: "Presupuesto inicial estimado" (WEDDING PLANNER) es un estimado; no se importa.');
  });
});

describe("migrateCouple: budget fixed prices", () => {
  // Columns B..H: Presupuesto, AR$, USD, TC, %, Fecha, Obs; TC is column E. The converted currency is a formula over it.
  const espacio: GridSheet = {
    name: "Espacio",
    rows: [
      [_, "Espacio - Salón Uno"],
      [_, "Presupuesto", "AR$", "USD", "TC", "%", "Fecha de pago", "Obs"],
      [_, "Seña - Espacio", 3600000, 2571.428571, 1400, _, "10/06/2026", _],
      [_, "Saldo - Espacio", 14350000, 10250, 1400, _, "20/01/2027", _],
      [_, "Adicionales - Espacio", 2000000, 1388.888889, 1440, _, "20/01/2027", _],
    ],
    merges: [],
    formulas: { "2,3": "C3/E3", "3,2": "D4*E4", "4,3": "C5/E5" },
  };
  const foto: GridSheet = {
    name: "Foto",
    rows: [
      [_, "Foto - Lente"],
      [_, "Presupuesto", "AR$", "USD", "TC", "%", "Fecha de pago", "Obs"],
      [_, "Seña - Foto", 1826500, 1300, 1405, _, "10/06/2026", _],
      [_, "Saldo - Foto", 1704000, 1200, 1420, _, "20/01/2027", _],
    ],
    merges: [],
    formulas: { "2,2": "D3*E3", "3,2": "D4*E4", "3,3": "2500-D3" },
  };
  const items = () => migrateCouple(couple({ presupuesto: [espacio, foto] })).data!.budget!.items;

  it("takes the typed price of each row, never the one converted with the row's TC", () => {
    expect(items().find((i) => i.category === "foto")).toMatchObject({ currency: "USD", amount: 2500, payments: [{ amount: 1300, currency: "USD", arsPerUsd: null }] });
  });

  it("keeps an unpaid row typed in the other currency as its own item at its typed price", () => {
    const espacioItems = items().filter((i) => i.category === "espacio");
    expect(espacioItems.map((i) => [i.currency, i.amount, i.payments!.length])).toEqual([
      ["ARS", 5600000, 1],
      ["USD", 10250, 0],
    ]);
    expect(espacioItems[1]).toMatchObject({ vendor: "Salón Uno", adjustment: "frozen", dueDate: "2027-01-20" });
  });

  it("records a paid row typed in the other currency as a payment at its typed price and TC", () => {
    const paidInUsd: GridSheet = {
      ...espacio,
      rows: [espacio.rows[0], espacio.rows[1], espacio.rows[2], [_, "Saldo - Espacio", 14350000, 10250, 1400, _, "01/06/2026", _]],
    };
    const item = migrateCouple(couple({ presupuesto: [paidInUsd] })).data!.budget!.items[0];
    expect(item).toMatchObject({ currency: "ARS", amount: 17950000 });
    expect(item.payments!.map((p) => [p.amount, p.currency, p.arsPerUsd])).toEqual([
      [10250, "USD", 1400],
      [3600000, "ARS", null],
    ]);
  });

  it("keeps the previous behavior for sheets read without formulas", () => {
    const plain = migrateCouple(couple({ presupuesto: [{ ...espacio, formulas: undefined }] })).data!.budget!.items;
    expect(plain.map((i) => [i.currency, i.amount])).toEqual([["ARS", 19950000]]);
  });
});

describe("migrateCouple: guests", () => {
  it("imports the guest list with the existing guest importer and reports a list it cannot read", () => {
    const invitados = sheet("Invitados", [
      ["TOTAL", 2],
      ["N", "APELLIDO", "NOMBRE", "EDAD", "RSVP"],
      [1, "Pérez", "Juan", "Adulto", "Si"],
      [2, "Gómez", "Rita", "Niño", _],
      [3, _, _, _, _],
      [4, "X", "X", _, _],
      [5, "X", "Leo", _, _],
    ]);
    const imported = migrateCouple(couple({ invitados: [invitados] }));
    expect(imported.data!.guests).toEqual([
      { name: "Juan", lastName: "Pérez", age: "adult", status: "confirmed" },
      { name: "Rita", lastName: "Gómez", age: "child", status: "pending" },
      { name: "Leo", status: "pending" },
    ]);
    expect(imported.warnings).toEqual(['Invitados: 1 fila de ejemplo ("X") omitida.']);
    const { data, warnings } = migrateCouple(couple({ invitados: [sheet("Hoja", [["Nada"]])] }));
    expect(data!.guests).toBeUndefined();
    expect(warnings).toContain("Invitados: No encontramos las columnas APELLIDO y NOMBRE en el Excel.");
  });
});

describe("migrateCouple: timing", () => {
  it("reads the Timing and Timing proveedores tabs and reports moments without a valid time", () => {
    const timing = sheet("Timing", [
      ["CASAMIENTO - 05/03/27"],
      ["Horario", "Horas", "Minutos", "Duración", "Actividad", "Descripción"],
      ["20:00", 0, 30, "30 min", "Cita de invitados", "Precóctel"],
      ["20:30 hs", 1, 0, "1h", "Ceremonia", _],
      ["30/12/1899", _, _, _, "Fin de fiesta", _],
      ["Cant. horas"],
    ]);
    const vendors = sheet("Timing proveedores", [
      ["Horario", "Rubro", "Empresa", "Contacto"],
      ["14:00", "Ambientación", "Deco Tres", "Sole"],
      [_, "Dj", "Sonido Seis", _],
      ["Horario de armado", "Horario de desarme"],
      ["08:00 hs", "03:00 hs"],
    ]);
    const { data, warnings } = migrateCouple(couple({ timing: [timing, vendors] }));
    expect(data!.timing).toEqual([
      { time: "20:00", title: "Cita de invitados", note: "Precóctel" },
      { time: "20:30", title: "Ceremonia", note: "" },
    ]);
    expect(data!.vendorTiming).toEqual([{ time: "14:00", category: "Ambientación", company: "Deco Tres", contact: "Sole" }]);
    expect(warnings).toEqual(['Timing: "Fin de fiesta" no tiene un horario válido; no se importa.', 'Timing proveedores: "Dj" no tiene un horario válido; no se importa.']);
  });
});

describe("migrateCouple: music", () => {
  it("maps moments by label, sub-moments under their group, statuses, custom moments and the extra rows", () => {
    const canciones = sheet("Elección de Canciones", [
      ["¡Elijan la música de su casamiento!"],
      [],
      ["Momento", _, "Canción", "Artista", "Estado", "Notas / Link"],
      ["Ingreso Invitados (Banda)", _, "Tema A", "Grupo A", "Elegida", "Versión acústica"],
      ["Ceremonia\n(Cuarteto)", "Entrada Cortejo", "No aplica", _, "No aplica", _],
      [_, "Salida de los novios", "Tema B", _, "Pendiente", _],
      [_, "Lectura especial", "Tema C", "Grupo C", "Elegida", _],
      ["Vals", _, _, _, "Pendiente", _],
      ["Entrada cotillon", _, "Tema D", _, "Elegida", _],
      ["Tandas", _, _, _, "Pendiente", _],
      ["Infaltables", _, "Tema E", "Grupo E", "Pendiente", _],
      ["Prohibidos", _, "Tema F", _, "Pendiente", _],
      ["Tienen una Playlist ya armada? Pueden dejarla aca!"],
      ["Link Playlist", _, "https://open.example.com/lista"],
    ]);
    const music = migrateCouple(couple({ canciones: [canciones] })).data!.music!;
    expect(music.songs).toEqual([
      { moment: "ingreso-invitados", song: "Tema A — Grupo A", artist: "", status: "chosen", note: "Banda\nVersión acústica" },
      { moment: "cortejo", song: "No aplica", artist: "", status: "pending", note: "" },
      { moment: "salida", song: "Tema B", artist: "", status: "pending", note: "" },
      { moment: "import-1", song: "Tema C — Grupo C", artist: "", status: "chosen", note: "" },
      { moment: "vals", song: "", artist: "", status: "pending", note: "" },
      { moment: "import-2", song: "Tema D", artist: "", status: "chosen", note: "" },
    ]);
    expect(music.customMoments).toEqual([
      { key: "import-1", label: "Lectura especial", group: "Ceremonia" },
      { key: "import-2", label: "Entrada cotillon", group: "Fiesta" },
    ]);
    expect(music).toMatchObject({ mustPlay: "Tema E - Grupo E", banned: "Tema F", playlistUrl: "https://open.example.com/lista" });
  });
});

describe("migrateCouple: family", () => {
  it("assigns sides by the section markers, keeps the notes column and skips the instruction rows", () => {
    const fotos = sheet("Fotos Familiares", [
      [_, "Nombre", "Vinculo", "Foto", "Info relevante"],
      ["LOLA", "Ana", "Madre", _, "Vestido verde"],
      [_, "Luis", "Padre", _, _],
      ["NOVIO", "Marta", "Abuela", _, _],
      ["Cómo insertar una foto?", _, "1. Apretan insertar"],
    ]);
    expect(migrateCouple(couple({ "fotos-familiares": [fotos] })).data!.family).toEqual([
      { side: "a", name: "Ana", relation: "Madre", notes: "Vestido verde" },
      { side: "a", name: "Luis", relation: "Padre", notes: "" },
      { side: "b", name: "Marta", relation: "Abuela", notes: "" },
    ]);
  });
});
