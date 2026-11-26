"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { COMPARISON_EDIT_LIMITS, type ComparisonSheet } from "@/core/comparison-table";
import { saveComparisonEdit } from "./actions";

type Status = "idle" | "saving" | "saved" | "error";

const CELL = "field min-w-36 py-1.5 text-sm";

/**
 * The comparison table edited on the web: rename, add and remove options (columns) and rows, and fill every cell.
 * Saves on its own a moment after each change; a table built from scratch is saved the same way.
 */
export function ComparisonEditor({
  coupleId,
  proposalId,
  initial,
  unsaved = false,
}: {
  coupleId: string;
  proposalId: string;
  initial: ComparisonSheet[];
  /** A table built from scratch, not stored yet: it saves right away. */
  unsaved?: boolean;
}) {
  const [sheets, setSheets] = useState(initial);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const skipFirst = useRef(!unsaved);

  useEffect(() => {
    // The table opened as it is stored needs no save until it changes.
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setStatus("saving");
      startTransition(async () => {
        const result = await saveComparisonEdit(coupleId, proposalId, JSON.stringify(sheets)).catch(() => ({ error: "No se pudo guardar. Revisá tu conexión." }));
        setError(result.error ?? null);
        setStatus(result.error ? "error" : "saved");
      });
    }, 1000);
    return () => clearTimeout(timer.current);
  }, [sheets, coupleId, proposalId]);

  const update = (s: number, change: (sheet: ComparisonSheet) => ComparisonSheet) => setSheets((all) => all.map((sheet, i) => (i === s ? change(sheet) : sheet)));
  const L = COMPARISON_EDIT_LIMITS;

  return (
    <div className="space-y-4">
      {sheets.map((sheet, s) => {
        const labels = sheet.columns.slice(1);
        return (
          <section key={s} className="space-y-2">
            {sheets.length > 1 && <p className="text-sm font-semibold text-teal">{sheet.name}</p>}
            <div className="overflow-x-auto rounded-xl p-1 ring-1 ring-forest/15">
              <table className="border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th />
                    {sheet.vendors.map((vendor, v) => (
                      <th key={v} className="align-bottom">
                        <div className="flex items-center gap-1">
                          <input
                            value={vendor.name}
                            maxLength={L.name}
                            aria-label={`Nombre de la opción ${v + 1}`}
                            onChange={(e) =>
                              update(s, (sh) => ({ ...sh, vendors: sh.vendors.map((x, i) => (i === v ? { ...x, name: e.target.value } : x)) }))
                            }
                            className={`${CELL} font-display text-base text-forest`}
                          />
                          {sheet.vendors.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => confirm(`¿Sacar la opción «${vendor.name}»?`) && update(s, (sh) => ({ ...sh, vendors: sh.vendors.filter((_, i) => i !== v) }))}
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                              <span className="sr-only">Sacar la opción {vendor.name}</span>
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label, r) => (
                    <tr key={r}>
                      <th scope="row">
                        <div className="flex items-center gap-1">
                          <input
                            value={label}
                            maxLength={L.name}
                            aria-label={`Nombre de la fila ${r + 1}`}
                            placeholder="Fila"
                            onChange={(e) => update(s, (sh) => ({ ...sh, columns: sh.columns.map((c, i) => (i === r + 1 ? e.target.value : c)) }))}
                            className={`${CELL} bg-cream font-semibold text-forest`}
                          />
                          {labels.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() =>
                                confirm(`¿Sacar la fila «${label || r + 1}»?`) &&
                                update(s, (sh) => ({
                                  ...sh,
                                  columns: sh.columns.filter((_, i) => i !== r + 1),
                                  vendors: sh.vendors.map((x) => ({ ...x, rows: [x.rows[0].filter((_, i) => i !== r)] })),
                                }))
                              }
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                              <span className="sr-only">Sacar la fila {label}</span>
                            </button>
                          )}
                        </div>
                      </th>
                      {sheet.vendors.map((vendor, v) => (
                        <td key={v}>
                          <textarea
                            value={vendor.rows[0]?.[r] ?? ""}
                            rows={2}
                            maxLength={L.cell}
                            aria-label={`${label} de ${vendor.name}`}
                            onChange={(e) =>
                              update(s, (sh) => ({
                                ...sh,
                                vendors: sh.vendors.map((x, i) =>
                                  i === v ? { ...x, rows: [labels.map((_, c) => (c === r ? e.target.value : (x.rows[0]?.[c] ?? "")))] } : x,
                                ),
                              }))
                            }
                            className={CELL}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={sheet.vendors.length >= L.vendors}
                onClick={() =>
                  update(s, (sh) => ({ ...sh, vendors: [...sh.vendors, { name: `Opción ${sh.vendors.length + 1}`, rows: [labels.map(() => "")] }] }))
                }
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Sumar opción
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={labels.length >= L.columns}
                onClick={() =>
                  update(s, (sh) => ({ ...sh, columns: [...sh.columns, ""], vendors: sh.vendors.map((x) => ({ ...x, rows: [[...(x.rows[0] ?? []), ""]] })) }))
                }
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Sumar fila
              </button>
            </div>
          </section>
        );
      })}
      <p role="status" aria-live="polite" className={`text-xs ${status === "error" ? "text-rust" : "text-ink/55"}`}>
        {status === "error" ? error : status === "saving" ? "Guardando…" : status === "saved" ? "¡Guardado!" : "Los cambios se guardan solos."}
      </p>
    </div>
  );
}
