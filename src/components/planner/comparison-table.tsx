import type { ComparisonSheet, ComparisonTable } from "@/core/comparison-table";

function SheetTable({ sheet }: { sheet: ComparisonSheet }) {
  const span = sheet.columns.length;
  let lastGroup: string | undefined;

  return (
    // Scrolls sideways on phones instead of squeezing the columns.
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {sheet.columns.map((column, i) => (
              <th
                key={i}
                scope="col"
                className={`border-b border-forest/15 bg-sand px-3 py-2 align-bottom text-xs font-semibold text-forest ${i === 0 ? "sticky left-0 z-10 rounded-tl-xl" : ""} ${i === span - 1 ? "rounded-tr-xl" : ""}`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.vendors.flatMap((vendor, v) => {
            const rows = [];
            if (vendor.group && vendor.group !== lastGroup) {
              rows.push(
                <tr key={`g${v}`}>
                  <th colSpan={span} scope="colgroup" className="border-b border-forest/10 bg-peach-soft px-3 py-1.5 text-xs font-semibold tracking-wide text-rust uppercase">
                    {vendor.group}
                  </th>
                </tr>,
              );
            }
            lastGroup = vendor.group;
            vendor.rows.forEach((cells, r) => {
              rows.push(
                <tr key={`${v}-${r}`} className={v % 2 === 1 ? "bg-cream/60" : "bg-white"}>
                  {r === 0 && (
                    <th
                      scope="rowgroup"
                      rowSpan={vendor.rows.length}
                      className="sticky left-0 z-10 border-b border-forest/10 bg-inherit px-3 py-2 align-top font-semibold whitespace-pre-line text-forest"
                    >
                      {vendor.name}
                    </th>
                  )}
                  {cells.map((cell, c) => (
                    <td key={c} className="min-w-32 border-b border-forest/10 px-3 py-2 align-top whitespace-pre-line text-ink/80">
                      {cell}
                    </td>
                  ))}
                </tr>,
              );
            });
            return rows;
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A vendor comparison table parsed from the agency's Excel; one block per sheet. */
export function ComparisonTableView({ table }: { table: ComparisonTable }) {
  const several = table.sheets.length > 1;
  return (
    <div className="space-y-5">
      {table.sheets.map((sheet, i) => (
        <section key={i} className="space-y-2">
          {several && <h3 className="text-sm font-semibold text-teal">{sheet.name}</h3>}
          <SheetTable sheet={sheet} />
        </section>
      ))}
    </div>
  );
}
