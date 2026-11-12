import type { TimingItem, VendorTimingItem } from "@/core/couple";
import { timingDurations } from "@/core/timing";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

export interface TimingActions {
  add: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
}

/** Hidden couple id for the team's actions; the couple's actions read it from the session instead. */
function CoupleField({ coupleId }: { coupleId?: string }) {
  return coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;
}

const ROW = "grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-end";

/** The wedding day schedule: each moment is edited in place; the list stays sorted by time. */
export function TimingEditor({ timing, actions, coupleId }: { timing: TimingItem[]; actions: TimingActions; coupleId?: string }) {
  const durations = timingDurations(timing);
  return (
    <div className="space-y-6">
      <form action={actions.add} className={`card ${ROW}`}>
        <CoupleField coupleId={coupleId} />
        <div>
          <label htmlFor="tm-time" className="label">Horario</label>
          <input id="tm-time" name="time" type="time" required className="field" />
        </div>
        <div>
          <label htmlFor="tm-title" className="label">Actividad</label>
          <input id="tm-title" name="title" required maxLength={120} placeholder="Ej: Ceremonia, entrada al salón, vals" className="field" />
        </div>
        <div>
          <label htmlFor="tm-note" className="label">Descripción</label>
          <input id="tm-note" name="note" maxLength={500} placeholder="Opcional" className="field" />
        </div>
        <SubmitButton pendingText="Sumando…">
          <Icon name="plus" className="h-4 w-4" />
          Sumar
        </SubmitButton>
      </form>

      <section className="card space-y-3">
        <h3 className="section-title">Cronograma del día</h3>
        {timing.length === 0 ? (
          <p className="text-sm text-ink/50">Todavía no hay momentos cargados.</p>
        ) : (
          <ol className="space-y-2">
            {timing.map((t, i) => (
              <li key={t.id} className="flex flex-wrap items-end gap-2 rounded-2xl p-2 ring-1 ring-forest/5">
                {durations[i] && <p className="w-full px-1 text-xs text-ink/50">Duración: {durations[i]}</p>}
                <form action={actions.update} className={`min-w-0 flex-1 ${ROW}`}>
                  <CoupleField coupleId={coupleId} />
                  <input type="hidden" name="itemId" value={t.id} />
                  <input name="time" type="time" required defaultValue={t.time} aria-label="Horario" className="field py-2 font-semibold text-forest" />
                  <input name="title" required maxLength={120} defaultValue={t.title} aria-label="Actividad" className="field py-2" />
                  <input name="note" maxLength={500} defaultValue={t.note} aria-label="Descripción" placeholder="Descripción" className="field py-2" />
                  <SubmitButton className="btn-ghost btn-sm" pendingText="…" doneText="¡Listo!">
                    <Icon name="check" className="h-3.5 w-3.5" />
                    Guardar
                  </SubmitButton>
                </form>
                <form action={actions.remove}>
                  <CoupleField coupleId={coupleId} />
                  <input type="hidden" name="itemId" value={t.id} />
                  <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar «${t.title}»?`}>
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sr-only">Quitar {t.title}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/** The couple's read-only schedule: they see how the day is laid out; the team edits it. */
export function TimingSchedule({ timing }: { timing: TimingItem[] }) {
  const durations = timingDurations(timing);
  return (
    <section className="card space-y-3">
      <h3 className="section-title">Cronograma del día</h3>
      {timing.length === 0 ? (
        <p className="text-sm text-ink/50">Todavía no hay momentos cargados. Lo vamos armando con ustedes.</p>
      ) : (
        <ol className="divide-y divide-forest/8">
          {timing.map((t, i) => (
            <li key={t.id} className="grid gap-1 py-3 sm:grid-cols-[5rem_1fr]">
              <span className="font-semibold text-teal tabular-nums">{t.time}</span>
              <span className="min-w-0">
                <span className="block text-forest">{t.title}</span>
                {t.note && <span className="block text-sm whitespace-pre-line text-ink/70">{t.note}</span>}
                {durations[i] && <span className="block text-xs text-ink/50">Duración: {durations[i]}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Read-only timeline, for the home card and summaries. */
export function TimingList({ timing, limit }: { timing: TimingItem[]; limit?: number }) {
  const durations = timingDurations(timing);
  const shown = limit ? timing.slice(0, limit) : timing;
  return (
    <ol className="space-y-2">
      {shown.map((t, i) => (
        <li key={t.id} className="flex gap-3">
          <span className="w-12 shrink-0 font-semibold text-teal tabular-nums">{t.time}</span>
          <span className="min-w-0">
            <span className="block truncate text-forest">
              {t.title}
              {durations[i] && <span className="text-xs text-ink/50"> · {durations[i]}</span>}
            </span>
            {t.note && <span className="block truncate text-sm text-ink/60">{t.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface VendorTimingActions {
  add: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
}

const VENDOR_ROW = "grid gap-2 sm:grid-cols-[7rem_1fr_1fr_1fr_auto] sm:items-end";

/** "Timing proveedores", edited by the team: when each vendor arrives, sets up or leaves. */
export function VendorTimingEditor({ items, actions, coupleId }: { items: VendorTimingItem[]; actions: VendorTimingActions; coupleId: string }) {
  return (
    <section className="card space-y-4">
      <div>
        <h3 className="section-title">Timing proveedores</h3>
        <p className="hint">Horario de llegada, armado o desarme de cada proveedor. La pareja lo ve en su portal.</p>
      </div>
      <form action={actions.add} className={VENDOR_ROW}>
        <CoupleField coupleId={coupleId} />
        <div>
          <label htmlFor="vt-time" className="label">Horario</label>
          <input id="vt-time" name="time" type="time" required className="field" />
        </div>
        <div>
          <label htmlFor="vt-category" className="label">Rubro</label>
          <input id="vt-category" name="category" required maxLength={80} placeholder="Ej: Ambientación" className="field" />
        </div>
        <div>
          <label htmlFor="vt-company" className="label">Empresa</label>
          <input id="vt-company" name="company" maxLength={120} className="field" />
        </div>
        <div>
          <label htmlFor="vt-contact" className="label">Contacto</label>
          <input id="vt-contact" name="contact" maxLength={200} placeholder="Nombre y teléfono" className="field" />
        </div>
        <SubmitButton pendingText="Sumando…">
          <Icon name="plus" className="h-4 w-4" />
          Sumar
        </SubmitButton>
      </form>
      {items.length > 0 && (
        <ol className="space-y-2">
          {items.map((v) => (
            <li key={v.id} className="flex flex-wrap items-end gap-2 rounded-2xl p-2 ring-1 ring-forest/5">
              <form action={actions.update} className={`min-w-0 flex-1 ${VENDOR_ROW}`}>
                <CoupleField coupleId={coupleId} />
                <input type="hidden" name="itemId" value={v.id} />
                <input name="time" type="time" required defaultValue={v.time} aria-label="Horario" className="field py-2 font-semibold text-forest" />
                <input name="category" required maxLength={80} defaultValue={v.category} aria-label="Rubro" className="field py-2" />
                <input name="company" maxLength={120} defaultValue={v.company} aria-label="Empresa" placeholder="Empresa" className="field py-2" />
                <input name="contact" maxLength={200} defaultValue={v.contact} aria-label="Contacto" placeholder="Contacto" className="field py-2" />
                <SubmitButton className="btn-ghost btn-sm" pendingText="…" doneText="¡Listo!">
                  <Icon name="check" className="h-3.5 w-3.5" />
                  Guardar
                </SubmitButton>
              </form>
              <form action={actions.remove}>
                <CoupleField coupleId={coupleId} />
                <input type="hidden" name="itemId" value={v.id} />
                <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar «${v.category}» de las ${v.time}?`}>
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Quitar {v.category}</span>
                </SubmitButton>
              </form>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Read-only "Timing proveedores" for the couple. */
export function VendorTimingTable({ items }: { items: VendorTimingItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="card space-y-3">
      <h3 className="section-title">Timing proveedores</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-xs tracking-wider text-ink/55 uppercase">
            <tr>
              <th className="py-2 pr-3 font-semibold">Horario</th>
              <th className="py-2 pr-3 font-semibold">Rubro</th>
              <th className="py-2 pr-3 font-semibold">Empresa</th>
              <th className="py-2 font-semibold">Contacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/5">
            {items.map((v) => (
              <tr key={v.id}>
                <td className="py-2 pr-3 font-semibold text-teal tabular-nums">{v.time}</td>
                <td className="py-2 pr-3 text-forest">{v.category}</td>
                <td className="py-2 pr-3">{v.company}</td>
                <td className="py-2 text-ink/70">{v.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
