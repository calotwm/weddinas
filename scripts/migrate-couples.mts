/**
 * Builds one "importar pareja" JSON per couple from the downloaded planner spreadsheets, plus report.md.
 *
 * Usage: npx vite-node scripts/migrate-couples.mts <data-dir> <out-dir>
 *
 * <data-dir> holds manifest.json ([{ name, year, dir, files: { brief: "brief.xlsx", ... }, missing: [...] }]) and one
 * folder per couple with its .xlsx files. <out-dir> must be outside the repository: client data never goes in it.
 * Every file is rehearsed on an in-memory repository, so report.md lists the files the admin upload would reject.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readComparisonWorkbook, type GridSheet } from "../src/core/comparison-table";
import { rehearseCoupleImport, type CoupleImport } from "../src/core/couple-import";
import { migrateCouple, SHEET_KINDS, type SheetKind } from "../src/core/sheet-migration";

/** Same limit as the admin upload (importCoupleFile). */
const MAX_FILE_BYTES = 1_000_000;

interface ManifestEntry {
  name: string;
  year: number;
  dir: string;
  files: Partial<Record<SheetKind, string>>;
  missing?: string[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * readComparisonWorkbook keeps only the day of a date cell, but the timing sheets store their times as time-formatted
 * dates ("18:00" is 1899-12-30T18:00). Re-reads those cells as "HH:MM".
 */
async function withClockTimes(bytes: Uint8Array, sheets: GridSheet[]): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  // Same workaround as readComparisonWorkbook: Google Sheets drawings crash exceljs.
  (workbook.xlsx as unknown as { _processDrawingEntry: () => Promise<void> })._processDrawingEntry = async () => undefined;
  const skipDrawings = { ignoreNodes: ["drawing"] } as unknown as Parameters<typeof workbook.xlsx.load>[1];
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0], skipDrawings);
  for (const ws of workbook.worksheets) {
    const grid = sheets.find((s) => s.name === ws.name);
    if (!grid) continue;
    ws.eachRow((row, r) =>
      row.eachCell((cell, c) => {
        const raw = cell.value as unknown;
        const value = raw && typeof raw === "object" && "result" in raw ? (raw as { result: unknown }).result : raw;
        const format = cell.numFmt ?? "";
        if (value instanceof Date && /h/i.test(format) && !/[dy]/i.test(format) && grid.rows[r - 1]) {
          grid.rows[r - 1][c - 1] = `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
        }
      }),
    );
  }
}

function counts(data: CoupleImport) {
  return {
    brief: data.brief?.length ?? 0,
    rubros: data.customRubros?.length ?? 0,
    items: data.budget?.items.length ?? 0,
    payments: data.budget?.items.reduce((n, i) => n + (i.payments?.length ?? 0), 0) ?? 0,
    guests: data.guests?.length ?? 0,
    timing: data.timing?.length ?? 0,
    vendorTiming: data.vendorTiming?.length ?? 0,
    songs: data.music?.songs.filter((s) => s.song).length ?? 0,
    family: data.family?.length ?? 0,
  };
}

async function main() {
  const [dataArg, outArg] = process.argv.slice(2);
  if (!dataArg || !outArg) {
    console.error("Usage: npx vite-node scripts/migrate-couples.mts <data-dir> <out-dir>");
    process.exit(1);
  }
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const dataDir = path.resolve(dataArg);
  const outDir = path.resolve(outArg);
  const inside = path.relative(repo, outDir);
  if (!inside.startsWith("..") && !path.isAbsolute(inside)) {
    console.error("The out-dir must be outside the repository: client data is never written into it.");
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });

  const manifest = JSON.parse(await readFile(path.join(dataDir, "manifest.json"), "utf8")) as ManifestEntry[];
  const today = new Date().toISOString().slice(0, 10);
  const table: string[] = [];
  const details: string[] = [];

  for (const [index, entry] of manifest.entries()) {
    const number = pad(index + 1);
    const warnings: string[] = (entry.missing ?? []).map((kind) => `Falta la planilla "${kind}".`);
    const sheets: Partial<Record<SheetKind, GridSheet[]>> = {};
    for (const kind of SHEET_KINDS) {
      const file = entry.files[kind];
      if (!file) continue;
      try {
        const bytes = new Uint8Array(await readFile(path.join(dataDir, entry.dir, file)));
        const grids = await readComparisonWorkbook(bytes);
        if (kind === "timing") await withClockTimes(bytes, grids);
        sheets[kind] = grids;
      } catch (e) {
        warnings.push(`No se pudo leer ${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const result = migrateCouple({ name: entry.name, year: entry.year, sheets, today });
    warnings.push(...result.warnings);
    let outcome = "no importada";
    const data = result.data;
    if (data) {
      const json = JSON.stringify(data, null, 2);
      const bytes = Buffer.byteLength(json);
      await writeFile(path.join(outDir, `${entry.dir}.json`), json);
      try {
        await rehearseCoupleImport(data);
        outcome = bytes > MAX_FILE_BYTES ? `ensayo ok, pero pesa ${bytes} bytes (máx. ${MAX_FILE_BYTES})` : "ensayo ok";
      } catch (e) {
        outcome = `ensayo falló: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    const c = data ? counts(data) : null;
    const date = data?.weddingDate.replace("T", " ") ?? "-";
    const names = data ? `${data.partnerA} & ${data.partnerB}` : entry.name;
    table.push(
      c
        ? `| ${number} | ${entry.dir} | ${names} | ${date} | ${c.brief} | ${c.rubros} | ${c.items} | ${c.payments} | ${c.guests} | ${c.timing} + ${c.vendorTiming} | ${c.songs} | ${c.family} | ${warnings.length} | ${outcome} |`
        : `| ${number} | ${entry.dir} | ${names} | - | - | - | - | - | - | - | - | - | ${warnings.length} | ${outcome} |`,
    );
    details.push(`## ${number} · ${names} (${entry.dir})`, "", `- Fecha: ${date}`, `- Resultado: ${outcome}`, ...(warnings.length ? ["- Advertencias:", ...warnings.map((w) => `  - ${w}`)] : ["- Sin advertencias"]), "");
    console.log(
      c
        ? `#${number} ${outcome} | brief ${c.brief} | rubros ${c.rubros} | items ${c.items} | pagos ${c.payments} | invitados ${c.guests} | timing ${c.timing}+${c.vendorTiming} | canciones ${c.songs} | familia ${c.family} | advertencias ${warnings.length}`
        : `#${number} ${outcome} | advertencias ${warnings.length}`,
    );
  }

  const report = [
    `# Migración de parejas (${today})`,
    "",
    "| # | Carpeta | Pareja | Fecha | Brief | Rubros propios | Ítems | Pagos | Invitados | Timing + prov. | Canciones | Familia | Advertencias | Resultado |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...table,
    "",
    ...details,
  ].join("\n");
  await writeFile(path.join(outDir, "report.md"), report);
  console.log(`Report: ${path.join(outDir, "report.md")}`);
}

await main();
