"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { LINE_STATES, type BriefBlock } from "@/core/couple";
import { saveBriefBlock, saveIdeas } from "@/app/admin/planner-actions";
import { BLOCK_STATUS } from "@/components/planner/brief";
import { NoteField } from "@/components/planner/note-field";

export function BriefBlockForm({ coupleId, block }: { coupleId: string; block: BriefBlock }) {
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
              <NoteField name="detail" defaultValue={f.detail} aria-label={`${f.label}: detalle`} placeholder="Detalle" className="field !py-2" />
              <input name="fieldNote" defaultValue={f.note} aria-label={`${f.label}: aclaraciones`} placeholder="Aclaraciones" className="field !py-2" />
              <select name="fieldState" defaultValue={f.state ?? ""} aria-label={`${f.label}: estado`} className="field !py-2 text-sm">
                <option value="">Sin estado</option>
                {LINE_STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
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
