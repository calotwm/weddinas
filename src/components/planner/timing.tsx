import type { TimingItem } from "@/core/couple";
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
  return (
    <div className="space-y-6">
      <form action={actions.add} className={`card ${ROW}`}>
        <CoupleField coupleId={coupleId} />
        <div>
          <label htmlFor="tm-time" className="label">Hora</label>
          <input id="tm-time" name="time" type="time" required className="field" />
        </div>
        <div>
          <label htmlFor="tm-title" className="label">Momento</label>
          <input id="tm-title" name="title" required maxLength={120} placeholder="Ej: Ceremonia, entrada al salón, vals" className="field" />
        </div>
        <div>
          <label htmlFor="tm-note" className="label">Nota</label>
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
            {timing.map((t) => (
              <li key={t.id} className="flex flex-wrap items-end gap-2 rounded-2xl p-2 ring-1 ring-forest/5">
                <form action={actions.update} className={`min-w-0 flex-1 ${ROW}`}>
                  <CoupleField coupleId={coupleId} />
                  <input type="hidden" name="itemId" value={t.id} />
                  <input name="time" type="time" required defaultValue={t.time} aria-label="Hora" className="field py-2 font-semibold text-forest" />
                  <input name="title" required maxLength={120} defaultValue={t.title} aria-label="Momento" className="field py-2" />
                  <input name="note" maxLength={500} defaultValue={t.note} aria-label="Nota" placeholder="Nota" className="field py-2" />
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

/** Read-only timeline, for the home card and summaries. */
export function TimingList({ timing, limit }: { timing: TimingItem[]; limit?: number }) {
  const shown = limit ? timing.slice(0, limit) : timing;
  return (
    <ol className="space-y-2">
      {shown.map((t) => (
        <li key={t.id} className="flex gap-3">
          <span className="w-12 shrink-0 font-semibold text-teal tabular-nums">{t.time}</span>
          <span className="min-w-0">
            <span className="block truncate text-forest">{t.title}</span>
            {t.note && <span className="block truncate text-sm text-ink/60">{t.note}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
