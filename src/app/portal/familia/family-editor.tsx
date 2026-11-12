import { Icon } from "@/components/icons";
import { FamilyColumns } from "@/components/planner/family";
import { SubmitButton } from "@/components/submit-button";
import type { CoupleView } from "@/core/couple";
import type { FamilyPhotoResult } from "./family-forms";
import { PhotoForm } from "./photo-form";

export interface FamilyActions {
  add: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  upload: (prev: FamilyPhotoResult, formData: FormData) => Promise<FamilyPhotoResult>;
}

const NOTES_PLACEHOLDER = "Color de vestido, rasgo en especial";

/**
 * Fotos familiares, editable: the couple's portal and the team's panel share it.
 * `coupleId` goes along for the team's actions; the couple's read it from the session.
 */
export function FamilyEditor({ couple, actions, coupleId }: { couple: CoupleView; actions: FamilyActions; coupleId?: string }) {
  const hidden = coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;

  return (
    <>
      <form action={actions.add} className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        {hidden}
        <div>
          <label htmlFor="fm-name" className="label">Nombre</label>
          <input id="fm-name" name="name" required maxLength={120} placeholder="Ej: Abuela Elena" className="field" />
        </div>
        <div>
          <label htmlFor="fm-relation" className="label">Vínculo</label>
          <input id="fm-relation" name="relation" maxLength={80} placeholder="Ej: Abuela, tío, padrino" className="field" />
        </div>
        <div>
          <label htmlFor="fm-side" className="label">Familia de</label>
          <select id="fm-side" name="side" className="field">
            <option value="a">{couple.partnerA}</option>
            <option value="b">{couple.partnerB}</option>
          </select>
        </div>
        <SubmitButton pendingText="Sumando…">
          <Icon name="plus" className="h-4 w-4" />
          Sumar
        </SubmitButton>
        <div className="sm:col-span-4">
          <label htmlFor="fm-notes" className="label">Aclaraciones</label>
          <textarea id="fm-notes" name="notes" rows={2} maxLength={500} placeholder={NOTES_PLACEHOLDER} className="field" />
        </div>
      </form>

      <FamilyColumns
        coupleId={couple.id}
        family={couple.family}
        sides={{ a: couple.partnerA, b: couple.partnerB }}
        action={(m) => (
          <div className="flex w-full flex-col gap-2">
            <div className="flex flex-wrap items-start justify-end gap-1">
              <PhotoForm memberId={m.id} hasPhoto={!!m.photoId} upload={actions.upload} coupleId={coupleId} />
              <form action={actions.remove}>
                {hidden}
                <input type="hidden" name="memberId" value={m.id} />
                <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar a ${m.name}?`}>
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Quitar a {m.name}</span>
                </SubmitButton>
              </form>
            </div>
            <details>
              <summary className="cursor-pointer text-xs font-semibold text-teal">Editar datos y aclaraciones</summary>
              <form action={actions.update} className="mt-2 grid gap-2 sm:grid-cols-2">
                {hidden}
                <input type="hidden" name="memberId" value={m.id} />
                <input name="name" required maxLength={120} defaultValue={m.name} aria-label="Nombre" placeholder="Nombre" className="field py-2" />
                <input name="relation" maxLength={80} defaultValue={m.relation} aria-label="Vínculo" placeholder="Vínculo" className="field py-2" />
                <textarea
                  name="notes"
                  rows={2}
                  maxLength={500}
                  defaultValue={m.notes}
                  aria-label={`Aclaraciones sobre ${m.name}`}
                  placeholder={NOTES_PLACEHOLDER}
                  className="field py-2 sm:col-span-2"
                />
                <div>
                  <SubmitButton className="btn-ghost btn-sm" pendingText="…" doneText="¡Listo!">
                    <Icon name="check" className="h-3.5 w-3.5" />
                    Guardar
                  </SubmitButton>
                </div>
              </form>
            </details>
          </div>
        )}
      />
    </>
  );
}
