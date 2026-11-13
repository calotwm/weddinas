import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { ComparisonSheet, ComparisonTable, ComparisonVendor } from "@/core/comparison-table";

interface Choice {
  /** Name of the vendor the couple chose; its column is tinted and marked "Elegida". */
  chosen?: string;
  /** The "Elegir" control under each other vendor's name; omitted where nobody can choose (the team's view). */
  renderChoose?: (vendor: string) => ReactNode;
}

/** A vendor's value for one row label; a vendor spanning several Excel rows shows them one per line. */
function cellOf(vendor: ComparisonVendor, column: number): string {
  return vendor.rows.map((row) => row[column] ?? "").filter((value) => value.trim()).join("\n");
}

// Every cell draws its right and bottom line; the box's ring draws the outer edge.
const CELL = "border-r border-b border-forest/20 px-3 py-2 text-center align-middle whitespace-pre-line";

function SheetTable({ sheet, chosen, renderChoose }: { sheet: ComparisonSheet } & Choice) {
  const labels = sheet.columns.slice(1);
  // Labels no vendor filled (template leftovers) would only add empty lines.
  const rows = labels.map((label, i) => ({ label, cells: sheet.vendors.map((v) => cellOf(v, i)) })).filter((row) => row.cells.some(Boolean));
  const tint = (vendor: ComparisonVendor) => (vendor.name === chosen ? "bg-peach-soft" : "bg-white");

  return (
    // Scrolls both ways inside its own box, so the vendor row and the label column stay fixed while reading.
    // `isolate` keeps the sticky cells' z-index inside the table, below the portal's sticky top bar.
    <div className="isolate max-h-[75vh] overflow-auto overscroll-contain rounded-xl ring-1 ring-forest/20">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={`${CELL} sticky top-0 left-0 z-30 bg-sand text-xs font-semibold text-forest`}>
              <span className="sr-only">{sheet.columns[0]}</span>
            </th>
            {sheet.vendors.map((vendor, v) => (
              <th key={v} scope="col" className={`${CELL} sticky top-0 z-20 min-w-36 ${vendor.name === chosen ? "bg-peach-soft" : "bg-sand"}`}>
                {vendor.group && <span className="block text-[11px] font-semibold tracking-wide text-rust uppercase">{vendor.group}</span>}
                <span className="block font-display text-lg leading-tight text-forest">{vendor.name}</span>
                {vendor.name === chosen ? (
                  <span className="btn-accent btn-sm mt-2 cursor-default">
                    <Icon name="check" className="h-3.5 w-3.5" />
                    Elegida
                  </span>
                ) : (
                  renderChoose && <div className="mt-2 flex justify-center">{renderChoose(vendor.name)}</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {/* Opaque, so the cells scrolling underneath do not show through. */}
              <th scope="row" className={`${CELL} sticky left-0 z-10 min-w-36 bg-cream font-semibold text-forest`}>
                {row.label}
              </th>
              {row.cells.map((cell, v) => (
                <td key={v} className={`${CELL} min-w-32 text-ink/80 ${tint(sheet.vendors[v])}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A vendor comparison table parsed from the agency's Excel, one block per sheet: one column per vendor with the
 * Excel's headers as row labels, so the vendors read side by side.
 */
export function ComparisonTableView({ table, chosen, renderChoose }: { table: ComparisonTable } & Choice) {
  const several = table.sheets.length > 1;
  return (
    <div className="space-y-5">
      {table.sheets.map((sheet, i) => (
        <section key={i} className="space-y-2">
          {several && <h3 className="text-sm font-semibold text-teal">{sheet.name}</h3>}
          <SheetTable sheet={sheet} chosen={chosen} renderChoose={renderChoose} />
        </section>
      ))}
    </div>
  );
}
