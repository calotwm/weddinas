"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { LINE_STATE_CHIP, LINE_STATE_DOT } from "@/components/planner/line-state";
import { CUSTOM_BLOCK_NAME_MAX } from "@/core/brief-catalog";
import { isLineState, LINE_STATES, type BriefBlock, type LineState } from "@/core/couple";
import { addCustomBriefBlock } from "@/app/admin/actions";
import { saveBriefBlock, saveIdeas } from "@/app/admin/planner-actions";
import { BLOCK_STATUS } from "@/components/planner/brief";
import { NoteField } from "@/components/planner/note-field";

/** `budgetPayment` is what the budget says about the rubro; it replaces typing the "Pago" detail by hand. */
export function BriefBlockForm({ coupleId, block, budgetPayment }: { coupleId: string; block: BriefBlock; budgetPayment?: string | null }) {
  const [state, action] = useActionState(saveBriefBlock, null);
  const id = block.key;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="coupleId" value={coupleId} />
      <input type="hidden" name="key" value={block.key} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {block.kind === "vendor" && (
          <>
            <div>
              <label htmlFor={`v-${id}`} className="label">Proveedor</label>
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
        <div className="hidden grid-cols-[minmax(8rem,1fr)_2fr_2fr_10rem] gap-3 bg-sand/60 px-4 py-2 text-xs font-semibold tracking-wider text-ink/60 uppercase sm:grid">
          <span>Campo</span>
          <span>Detalle</span>
          <span>Aclaraciones (solo equipo)</span>
          <span>Estado</span>
        </div>
        <div className="divide-y divide-forest/5">
          {block.fields.map((f, i) => (
            <div key={`${f.label}-${i}`} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(8rem,1fr)_2fr_2fr_10rem] sm:items-center sm:gap-3">
              <input type="hidden" name="label" value={f.label} />
              <span className="text-sm font-semibold text-forest">{f.label}</span>
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
            </div>
          ))}
          <div className="grid gap-2 bg-peach-soft/50 px-4 py-3 sm:grid-cols-[minmax(8rem,1fr)_4fr] sm:items-center sm:gap-3">
            <input name="newLabel" maxLength={120} aria-label="Nuevo campo" placeholder="+ Nuevo campo" className="field !py-2" />
            <NoteField name="newDetail" aria-label="Detalle del nuevo campo" placeholder="Detalle" className="field !py-2" />
          </div>
        </div>
      </div>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      <SubmitButton doneText="¡Guardado!">Guardar {block.name.toLowerCase()}</SubmitButton>
    </form>
  );
}

/** The line's state, painted in its color (dot and background) so the brief reads like the agency's Excel. */
function LineStateSelect({ label, defaultValue }: { label: string; defaultValue?: LineState }) {
  const [state, setState] = useState<LineState | "">(defaultValue ?? "");
  const ref = useRef<HTMLSelectElement>(null);
  // The select stays uncontrolled so the form's reset after saving works as for the other fields; the color follows the DOM value.
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
  const [, action] = useActionState(saveIdeas, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="coupleId" value={coupleId} />
      <textarea name="ideas" defaultValue={ideas} rows={4} aria-label="Ideas generales" placeholder="Estilo, paleta, cosas que les importan, lo que no quieren…" className="field" />
      <SubmitButton className="btn-ghost btn-sm" doneText="¡Guardado!">Guardar ideas</SubmitButton>
    </form>
  );
}
