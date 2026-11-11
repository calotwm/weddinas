"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { ComparisonTableView } from "@/components/planner/comparison-table";
import { SubmitButton } from "@/components/submit-button";
import type { ComparisonTable } from "@/core/comparison-table";
import { removeComparison, uploadComparison } from "./actions";

/** Team view of a proposal's comparison table: the parsed table, upload (or replace) and remove. */
export function AdminComparison({ coupleId, proposalId, comparison }: { coupleId: string; proposalId: string; comparison?: ComparisonTable | null }) {
  const [state, action] = useActionState(uploadComparison, null);
  const inputId = `comparison-${proposalId}`;

  return (
    <details className="mt-3" open={Boolean(state?.error)}>
      <summary className="cursor-pointer text-xs font-semibold text-teal">Cuadro comparativo{comparison ? ` · ${comparison.fileName}` : ""}</summary>
      <div className="mt-3 space-y-3">
        {comparison && (
          <>
            <ComparisonTableView table={comparison} />
            <form action={removeComparison}>
              <input type="hidden" name="coupleId" value={coupleId} />
              <input type="hidden" name="proposalId" value={proposalId} />
              <SubmitButton className="btn-ghost btn-sm" pendingText="Quitando…" confirm="¿Quitar el cuadro comparativo de esta propuesta?">
                <Icon name="trash" className="h-3.5 w-3.5" />
                Quitar cuadro
              </SubmitButton>
            </form>
          </>
        )}
        <form action={action} className="space-y-2 rounded-2xl bg-cream/60 p-3 ring-1 ring-forest/5">
          <input type="hidden" name="coupleId" value={coupleId} />
          <input type="hidden" name="proposalId" value={proposalId} />
          <label htmlFor={inputId} className="label">
            {comparison ? "Reemplazar por otro cuadro (.xlsx hasta 5 MB)" : "Subí el cuadro comparativo del rubro (.xlsx hasta 5 MB)"}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={inputId}
              name="file"
              type="file"
              required
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="min-w-0 flex-1 text-sm"
            />
            <SubmitButton className="btn-ghost btn-sm" pendingText="Leyendo…">
              <Icon name="plus" className="h-3.5 w-3.5" />
              {comparison ? "Reemplazar" : "Subir"}
            </SubmitButton>
          </div>
          {state?.error && <p role="alert" className="text-xs text-rust">{state.error}</p>}
        </form>
      </div>
    </details>
  );
}
