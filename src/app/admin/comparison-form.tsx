"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icons";
import { ComparisonTableView } from "@/components/planner/comparison-table";
import { SubmitButton } from "@/components/submit-button";
import { blankComparison, editableSheets, type ComparisonTable } from "@/core/comparison-table";
import { ComparisonEditor } from "./comparison-editor";
import { addProposal, removeComparison, uploadComparison } from "./actions";
import { megabytes, UPLOAD_REQUEST_MAX_BYTES } from "@/core/upload-limits";

// Same cap as addProposal on the server; checked here first so a too-heavy pick does not clear the typed form.
const NEW_PROPOSAL_MAX_BYTES = UPLOAD_REQUEST_MAX_BYTES;
const NEW_PROPOSAL_MAX_FILES = 10;

/**
 * "Nueva propuesta" form: the fields come from the page, plus the comparison Excel and the files for the couple,
 * all sent in one submit.
 */
export function NewProposalForm({ coupleId, children }: { coupleId: string; children: React.ReactNode }) {
  const [state, action] = useActionState(addProposal, null);
  const [tooHeavy, setTooHeavy] = useState<string | null>(null);
  const error = tooHeavy ?? state?.error;

  function check(e: React.FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    const picked = [data.get("comparison"), ...data.getAll("files")].filter((f): f is File => f instanceof File && f.size > 0);
    const docs = data.getAll("files").filter((f) => f instanceof File && f.size > 0).length;
    let problem: string | null = null;
    if (docs > NEW_PROPOSAL_MAX_FILES) problem = `Subí hasta ${NEW_PROPOSAL_MAX_FILES} archivos por vez.`;
    else if (picked.reduce((n, f) => n + f.size, 0) > NEW_PROPOSAL_MAX_BYTES) problem = `Entre el cuadro y los archivos pesan más de ${megabytes(NEW_PROPOSAL_MAX_BYTES)}. Sumá el resto desde la propuesta.`;
    setTooHeavy(problem);
    if (problem) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={check} className="space-y-4">
      <input type="hidden" name="coupleId" value={coupleId} />
      {children}
      <div className="space-y-3 rounded-2xl bg-cream/60 p-3 ring-1 ring-forest/5">
        <div>
          <label htmlFor="p-comparison" className="label">Cuadro comparativo (opcional)</label>
          <input
            id="p-comparison"
            name="comparison"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="w-full text-sm"
          />
          <p className="hint mt-1">El Excel del rubro (.xlsx hasta 5 MB): los novios lo ven como cuadro con un botón para elegir cada proveedor. ¿Sin Excel? Guardá la propuesta y armá el cuadro de cero desde ella.</p>
        </div>
        <div>
          <label htmlFor="p-files" className="label">PDFs e imágenes (opcional)</label>
          <input id="p-files" name="files" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="w-full text-sm" />
          <p className="hint mt-1">Hasta {NEW_PROPOSAL_MAX_FILES} archivos; entre todo, cuadro incluido, hasta {megabytes(NEW_PROPOSAL_MAX_BYTES)}.</p>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="intent" value="present" className="btn-accent" pendingText="Presentando…" doneText="¡Listo!">Presentar a los novios</SubmitButton>
        <SubmitButton name="intent" value="draft" className="btn-ghost" pendingText="Guardando…" doneText="¡Guardada!">Guardar borrador</SubmitButton>
      </div>
      <p className="hint">Los borradores no los ven los novios hasta que los presentes.</p>
    </form>
  );
}

/** Team view of a proposal's comparison table: the parsed table (with the couple's choice), upload (or replace) and remove. */
export function AdminComparison({
  coupleId,
  proposalId,
  comparison,
  chosen,
}: {
  coupleId: string;
  proposalId: string;
  comparison?: ComparisonTable | null;
  chosen?: string;
}) {
  const [state, action] = useActionState(uploadComparison, null);
  const [editing, setEditing] = useState(false);
  const inputId = `comparison-${proposalId}`;

  return (
    <details className="mt-3" open={Boolean(state?.error)}>
      <summary className="cursor-pointer text-xs font-semibold text-teal">Cuadro comparativo{comparison ? ` · ${comparison.fileName}` : ""}</summary>
      <div className="mt-3 space-y-3">
        {comparison && (
          <>
            {editing ? (
              <ComparisonEditor coupleId={coupleId} proposalId={proposalId} initial={editableSheets(comparison.sheets)} />
            ) : (
              <ComparisonTableView table={comparison} chosen={chosen} />
            )}
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing((e) => !e)}>
              <Icon name={editing ? "check" : "edit"} className="h-3.5 w-3.5" />
              {editing ? "Listo, ver cuadro" : "Editar filas y columnas"}
            </button>
            {comparison.attachmentId && (
              <a href={`/archivos/${coupleId}/${comparison.attachmentId}`} download={comparison.fileName} className="inline-flex items-center gap-1 text-xs font-semibold text-teal underline">
                <Icon name="file" className="h-3.5 w-3.5" />
                Descargar {comparison.fileName}
              </a>
            )}
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
        {!comparison &&
          (editing ? (
            <ComparisonEditor coupleId={coupleId} proposalId={proposalId} initial={[blankComparison()]} unsaved />
          ) : (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(true)}>
              <Icon name="plus" className="h-3.5 w-3.5" />
              Armar cuadro de cero
            </button>
          ))}
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
