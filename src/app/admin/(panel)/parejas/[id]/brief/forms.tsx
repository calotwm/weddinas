"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { LINE_STATE_CHIP, LINE_STATE_DOT } from "@/components/planner/line-state";
import { CUSTOM_BLOCK_NAME_MAX } from "@/core/brief-catalog";
import { isLineState, LINE_STATES, type BriefBlock, type LineState } from "@/core/couple";
import { addCustomBriefBlock } from "@/app/admin/actions";
import { saveBriefBlock, saveIdeas } from "@/app/admin/planner-actions";
import { BLOCK_STATUS } from "@/components/planner/brief";
import { NoteField } from "@/components/planner/note-field";

const AUTOSAVE_DELAY_MS = 700;

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Saves the form a moment after the last edit (and right away on blur), one request at a time: edits made while a
 * save runs go out in the next one, so an older save never lands after a newer one.
 */
function useAutosave(formRef: React.RefObject<HTMLFormElement | null>, save: (prev: null, data: FormData) => Promise<{ error?: string } | null>) {
  const [status, setStatus] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);
  const queued = useRef(false);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (running.current) {
      queued.current = true;
      return;
    }
    const form = formRef.current;
    if (!form) return;
    running.current = true;
    setStatus("saving");
    const result = await save(null, new FormData(form)).catch(() => ({ error: "No se pudo guardar. Revisá la conexión." }));
    running.current = false;
    setError(result?.error ?? null);
    setStatus(result?.error ? "error" : "saved");
    if (queued.current) {
      queued.current = false;
      void flush();
    }
  }, [formRef, save]);

  const schedule = useCallback(() => {
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
  }, [flush]);

  // Leaving with an edit still waiting for its save asks first.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current || running.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  /** On blur: saves now what is waiting, instead of after the delay. */
  const flushPending = useCallback(() => {
    if (timer.current) void flush();
  }, [flush]);

  return { status, error, schedule, flushPending };
}

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "Se guarda solo al escribir",
  pending: "Cambios sin guardar…",
  saving: "Guardando…",
  saved: "Guardado",
  error: "No se guardó",
};

type Row = BriefBlock["fields"][number] & { rowId: number; isNew?: boolean };

/**
 * One brief block, saved as the team types (no "Guardar" button). Field rows can be removed and moved; their order
 * is the order sent. `budgetPayment` is what the budget says about the rubro; it replaces typing the "Pago" detail.
 * The selects stay uncontrolled but the form is never reset, so they keep what was chosen (the old action-form reset
 * put them back on their first value while the header already showed the saved status).
 */
export function BriefBlockForm({ coupleId, block, budgetPayment }: { coupleId: string; block: BriefBlock; budgetPayment?: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { status, error, schedule, flushPending } = useAutosave(formRef, saveBriefBlock);
  const nextId = useRef(block.fields.length);
  const [rows, setRows] = useState<Row[]>(() => block.fields.map((f, i) => ({ ...f, rowId: i })));
  const id = block.key;
  const hasVendor = block.kind === "vendor" || block.key === "ceremonia";

  // Row changes re-render first, then save the form as it now reads.
  const changeRows = (next: (rows: Row[]) => Row[]) => {
    setRows(next);
    schedule();
  };
  const move = (index: number, by: -1 | 1) =>
    changeRows((rs) => {
      const to = index + by;
      if (to < 0 || to >= rs.length) return rs;
      const copy = [...rs];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
  const remove = (index: number) => changeRows((rs) => rs.filter((_, i) => i !== index));
  const add = () => setRows((rs) => [...rs, { label: "", detail: "", note: "", rowId: nextId.current++, isNew: true }]);

  return (
    <form ref={formRef} onChange={schedule} onBlur={flushPending} onSubmit={(e) => e.preventDefault()} className="space-y-4">
      <input type="hidden" name="coupleId" value={coupleId} />
      <input type="hidden" name="key" value={block.key} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hasVendor && (
          <>
            <div>
              <label htmlFor={`v-${id}`} className="label">{block.kind === "vendor" ? "Proveedor" : "Contratado"}</label>
              <input id={`v-${id}`} name="vendor" defaultValue={block.vendor} maxLength={120} className="field" />
            </div>
            <div>
              <label htmlFor={`c-${id}`} className="label">Contacto</label>
              <input id={`c-${id}`} name="contact" defaultValue={block.contact} maxLength={200} className="field" placeholder="Tel, mail o grupo de WhatsApp" />
            </div>
          </>
        )}
        <div>
          <label htmlFor={`s-${id}`} className="label">Estado</label>
          <select id={`s-${id}`} name="status" defaultValue={block.status} className="field">
            {Object.entries(BLOCK_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`o-${id}`} className="label">A cargo (equipo)</label>
          <input id={`o-${id}`} name="owner" defaultValue={block.owner} maxLength={60} className="field" placeholder="Ej: Pau" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-forest/10">
        <div className="hidden grid-cols-[minmax(8rem,1fr)_2fr_2fr_10rem_5.5rem] gap-3 bg-sand/60 px-4 py-2 text-xs font-semibold tracking-wider text-ink/60 uppercase sm:grid">
          <span>Campo</span>
          <span>Detalle</span>
          <span>Aclaraciones (solo equipo)</span>
          <span>Estado</span>
          <span className="sr-only">Mover o quitar</span>
        </div>
        <div className="divide-y divide-forest/5">
          {rows.map((f, i) => (
            <div key={f.rowId} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(8rem,1fr)_2fr_2fr_10rem_5.5rem] sm:items-center sm:gap-3">
              {f.isNew ? (
                <input name="label" maxLength={120} aria-label="Nombre del nuevo campo" placeholder="Nombre del campo" autoFocus className="field !py-2 text-sm font-semibold" />
              ) : (
                <>
                  <input type="hidden" name="label" value={f.label} />
                  <span className="text-sm font-semibold text-forest">{f.label}</span>
                </>
              )}
              {budgetPayment && f.label === "Pago" ? (
                <div>
                  {/* The stored manual detail is kept untouched; the couple sees the budget's figure instead. */}
                  <input type="hidden" name="detail" value={f.detail} />
                  <p className="text-sm font-semibold text-forest">{budgetPayment}</p>
                  <p className="text-xs text-ink/55">Sale del presupuesto</p>
                </div>
              ) : (
                <NoteField name="detail" defaultValue={f.detail} aria-label={`${f.label}: detalle`} placeholder="Detalle" className="field !py-2" />
              )}
              <input name="fieldNote" defaultValue={f.note} aria-label={`${f.label}: aclaraciones`} placeholder="Aclaraciones" className="field !py-2" />
              <LineStateSelect label={f.label} defaultValue={f.state} />
              <div className="flex items-center justify-end gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir ${f.label || "campo"}`} title="Subir" className="btn-icon text-ink/60 hover:bg-sand disabled:opacity-30">
                  <Icon name="arrowRight" className="h-3.5 w-3.5 -rotate-90" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Bajar ${f.label || "campo"}`} title="Bajar" className="btn-icon text-ink/60 hover:bg-sand disabled:opacity-30">
                  <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => (f.isNew || confirm(`¿Quitar "${f.label}"? Se pierde lo cargado en esa fila.`)) && remove(i)}
                  aria-label={`Quitar ${f.label || "campo"}`}
                  title="Quitar"
                  className="btn-icon text-lg leading-none text-rust hover:bg-peach"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <div className="bg-peach-soft/50 px-4 py-3">
            <button type="button" onClick={add} className="btn-ghost btn-sm">
              <Icon name="plus" className="h-3.5 w-3.5" />
              Nuevo campo
            </button>
          </div>
        </div>
      </div>
      <p role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-rust" : "text-ink/55"}`}>
        {status === "error" && error ? error : SAVE_LABEL[status]}
      </p>
    </form>
  );
}

/** The line's state, painted in its color (dot and background) so the brief reads like the agency's Excel. */
function LineStateSelect({ label, defaultValue }: { label: string; defaultValue?: LineState }) {
  const [state, setState] = useState<LineState | "">(defaultValue ?? "");
  const ref = useRef<HTMLSelectElement>(null);
  // The select stays uncontrolled like the other fields of the form; the color follows the DOM value.
  const sync = () => setState(isLineState(ref.current?.value) ? (ref.current!.value as LineState) : "");
  useEffect(() => {
    sync();
    const form = ref.current?.form;
    const onReset = () => setTimeout(sync);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [defaultValue]);
  return (
    <div className="relative">
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 left-3 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${state ? LINE_STATE_DOT[state] : "ring-1 ring-ink/25"}`}
      />
      <select
        ref={ref}
        name="fieldState"
        defaultValue={defaultValue ?? ""}
        onChange={sync}
        aria-label={`${label}: estado`}
        className={`field !py-2 !pl-8 text-sm ${state ? LINE_STATE_CHIP[state] : ""}`}
      >
        <option value="">Sin estado</option>
        {LINE_STATES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

/** "Otra opción": a vendor rubro outside the list, by name. */
export function CustomBlockForm({ coupleId }: { coupleId: string }) {
  const [state, action] = useActionState(addCustomBriefBlock, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="coupleId" value={coupleId} />
      <label htmlFor="add-custom" className="sr-only">Otra opción: nombre del rubro</label>
      <input id="add-custom" name="name" required maxLength={CUSTOM_BLOCK_NAME_MAX} placeholder="Otra opción (ej: Fuegos artificiales)" className="field !w-64 !py-1.5 text-sm" />
      <SubmitButton className="btn-ghost btn-sm" pendingText="…">
        <Icon name="plus" className="h-3.5 w-3.5" />
        Agregar
      </SubmitButton>
      {state?.error && <p role="alert" className="w-full text-sm text-rust">{state.error}</p>}
    </form>
  );
}

export function IdeasForm({ coupleId, ideas }: { coupleId: string; ideas: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const { status, error, schedule, flushPending } = useAutosave(formRef, saveIdeas);
  return (
    <form ref={formRef} onChange={schedule} onBlur={flushPending} onSubmit={(e) => e.preventDefault()} className="space-y-2">
      <input type="hidden" name="coupleId" value={coupleId} />
      <textarea name="ideas" defaultValue={ideas} rows={4} aria-label="Ideas generales" placeholder="Estilo, paleta, cosas que les importan, lo que no quieren…" className="field" />
      <p role="status" aria-live="polite" className={`text-sm ${status === "error" ? "text-rust" : "text-ink/55"}`}>
        {status === "error" && error ? error : SAVE_LABEL[status]}
      </p>
    </form>
  );
}
