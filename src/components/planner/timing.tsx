import type { TimingItem, TimingSettings, VendorTimingItem } from "@/core/couple";
import { durationParts, nextTimingTime, timingDurationLabels } from "@/core/timing";
import { AutoSaveForm } from "../auto-save-form";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

export interface TimingActions {
  add: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
}

export interface TimingColumnActions {
  add: (formData: FormData) => Promise<void>;
  rename: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  showHoursMinutes: (formData: FormData) => Promise<void>;
}

/** Hidden couple id for the team's actions; the couple's actions read it from the session instead. */
function CoupleField({ coupleId }: { coupleId?: string }) {
  return coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;
}

/** A time on a 24-hour clock ("17:30"): a text field, so no browser shows it with am/pm. */
export function ClockInput({ id, defaultValue, className = "" }: { id?: string; defaultValue?: string; className?: string }) {
  return (
    <input
      id={id}
      name="time"
      required
      inputMode="numeric"
      maxLength={5}
      pattern="([01]?[0-9]|2[0-3])[:.][0-5][0-9]"
      title="Horario de 0:00 a 23:59, por ejemplo 17:30"
      placeholder="17:30"
      defaultValue={defaultValue}
      aria-label={id ? undefined : "Horario"}
      className={`field tabular-nums ${className}`}
    />
  );
}

/** The columns of the agency's timing sheet, in its order, then the team-only columns, the team-only tick, the row's save status and its delete button. */
function gridTemplate(settings: TimingSettings) {
  const hm = settings.showHoursMinutes ? "4.5rem 4.5rem " : "";
  return `5.5rem ${hm}6.5rem minmax(11rem,1fr) minmax(14rem,1.4fr) ${settings.columns.map(() => "minmax(10rem,1fr) ").join("")}5.5rem 4.5rem 2.5rem`;
}

function Caption({ children, team }: { children: React.ReactNode; team?: boolean }) {
  return <span className={`px-1 text-[11px] font-semibold tracking-wider uppercase ${team ? "text-rust" : "text-ink/55"}`}>{children}</span>;
}

/** Horas and Minutos of a moment, as in the sheet; hidden fields when the team hides those columns, so saving keeps them. */
function DurationFields({ item, shown }: { item?: TimingItem; shown: boolean }) {
  const { hours, minutes } = durationParts(item?.durationMin);
  if (!shown) {
    return (
      <>
        <input type="hidden" name="hours" value={hours ?? ""} />
        <input type="hidden" name="minutes" value={minutes ?? ""} />
      </>
    );
  }
  return (
    <>
      <input name="hours" type="number" min={0} max={23} step={1} defaultValue={hours ?? ""} aria-label="Horas" placeholder="0" className="field py-2 tabular-nums" />
      <input name="minutes" type="number" min={0} max={59} step={5} defaultValue={minutes ?? ""} aria-label="Minutos" placeholder="30" className="field py-2 tabular-nums" />
    </>
  );
}

/** One moment's fields in the sheet's order; the add form and every saved row share it. */
function TimingFields({ item, settings, duration, defaultTime }: { item?: TimingItem; settings: TimingSettings; duration?: string | null; defaultTime?: string }) {
  return (
    <>
      <ClockInput defaultValue={item?.time ?? defaultTime} className="py-2 font-semibold text-forest" />
      <DurationFields item={item} shown={settings.showHoursMinutes} />
      <span className="self-center px-1 text-sm text-ink/60 tabular-nums">{duration ?? "—"}</span>
      <input name="title" required maxLength={120} defaultValue={item?.title} aria-label="Actividad" placeholder="Actividad" className="field py-2" />
      <textarea name="note" rows={2} maxLength={500} defaultValue={item?.note} aria-label="Descripción" placeholder="Descripción" className="field py-2" />
      {settings.columns.map((col) => (
        <textarea
          key={col.id}
          name={`col:${col.id}`}
          rows={2}
          maxLength={500}
          defaultValue={item?.team?.[col.id]}
          aria-label={`${col.name} (solo equipo)`}
          placeholder={col.name}
          className="field bg-peach-soft py-2"
        />
      ))}
      <label className="flex items-center gap-1.5 self-center text-xs text-rust">
        <input type="checkbox" name="teamOnly" defaultChecked={item?.teamOnly ?? false} />
        Solo equipo
      </label>
    </>
  );
}

/**
 * The wedding day schedule as the agency's sheet: Horario, Horas, Minutos, Duración, Actividad, Descripción, then the
 * team-only columns. Each moment saves on its own; the list stays sorted by time. Team-only moments and columns never
 * reach the couple.
 */
export function TimingEditor({
  timing,
  settings,
  actions,
  columnActions,
  coupleId,
}: {
  timing: TimingItem[];
  settings: TimingSettings;
  actions: TimingActions;
  columnActions: TimingColumnActions;
  coupleId: string;
}) {
  const durations = timingDurationLabels(timing);
  const style = { gridTemplateColumns: gridTemplate(settings) };
  const row = "grid items-start gap-2";

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-title">Cronograma del día</h3>
          <AutoSaveForm compact save={columnActions.showHoursMinutes} className="flex items-center gap-2 text-sm">
            <CoupleField coupleId={coupleId} />
            <label className="flex items-center gap-2">
              <input type="checkbox" name="show" value="yes" defaultChecked={settings.showHoursMinutes} />
              Mostrar Horas y Minutos
            </label>
          </AutoSaveForm>
        </div>
        <p className="hint">
          Horario en 24 hs (ej. 17:30). Cargá la duración en Horas y Minutos: el próximo momento te propone el horario en que termina. Las columnas en
          naranja y los momentos &quot;Solo equipo&quot; no los ven los novios.
        </p>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-max space-y-2">
            <div className={row} style={style} aria-hidden>
              <Caption>Horario</Caption>
              {settings.showHoursMinutes && (
                <>
                  <Caption>Horas</Caption>
                  <Caption>Minutos</Caption>
                </>
              )}
              <Caption>Duración</Caption>
              <Caption>Actividad</Caption>
              <Caption>Descripción</Caption>
              {settings.columns.map((col) => (
                <Caption key={col.id} team>
                  {col.name}
                </Caption>
              ))}
              <span />
              <span />
              <span />
            </div>
            {timing.length === 0 && <p className="text-sm text-ink/50">Todavía no hay momentos cargados.</p>}
            {timing.map((t, i) => (
              <div key={t.id} className={`${row} rounded-2xl p-1 ${t.teamOnly ? "bg-peach-soft ring-1 ring-peach" : ""}`} style={style}>
                <AutoSaveForm compact save={actions.update} className="contents">
                  <CoupleField coupleId={coupleId} />
                  <input type="hidden" name="itemId" value={t.id} />
                  <TimingFields item={t} settings={settings} duration={durations[i]} />
                </AutoSaveForm>
                <form action={actions.remove}>
                  <CoupleField coupleId={coupleId} />
                  <input type="hidden" name="itemId" value={t.id} />
                  <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar «${t.title}»?`}>
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sr-only">Quitar {t.title}</span>
                  </SubmitButton>
                </form>
              </div>
            ))}
            {/* Keyed by the count, so after each add the form starts over with the next suggested time. */}
            <form key={timing.length} action={actions.add} className={`${row} border-t border-forest/10 pt-3`} style={style}>
              <CoupleField coupleId={coupleId} />
              <TimingFields settings={settings} defaultTime={nextTimingTime(timing)} />
              <span />
              <SubmitButton className="btn-icon" pendingText="…">
                <Icon name="plus" className="h-4 w-4" />
                <span className="sr-only">Sumar momento</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </section>

      <TimingColumnsEditor settings={settings} actions={columnActions} coupleId={coupleId} />
    </div>
  );
}

/** The team-only columns: rename them (saves on its own), take them out or add more. */
function TimingColumnsEditor({ settings, actions, coupleId }: { settings: TimingSettings; actions: TimingColumnActions; coupleId: string }) {
  return (
    <section className="card space-y-3">
      <div>
        <h3 className="section-title">Columnas del equipo</h3>
        <p className="hint">Solo las ve el equipo. Cambiales el nombre, sacalas o sumá más.</p>
      </div>
      <ul className="flex flex-wrap gap-2">
        {settings.columns.map((col) => (
          <li key={col.id} className="flex items-center gap-1">
            <AutoSaveForm compact save={actions.rename}>
              <CoupleField coupleId={coupleId} />
              <input type="hidden" name="columnId" value={col.id} />
              <input name="name" required maxLength={40} defaultValue={col.name} aria-label="Nombre de la columna" className="field w-40 py-2" />
            </AutoSaveForm>
            <form action={actions.remove}>
              <CoupleField coupleId={coupleId} />
              <input type="hidden" name="columnId" value={col.id} />
              <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Sacar la columna «${col.name}» y lo que tiene cargado?`}>
                <Icon name="trash" className="h-4 w-4" />
                <span className="sr-only">Sacar la columna {col.name}</span>
              </SubmitButton>
            </form>
          </li>
        ))}
      </ul>
      <form action={actions.add} className="flex flex-wrap items-center gap-2">
        <CoupleField coupleId={coupleId} />
        <input name="name" required maxLength={40} aria-label="Nombre de la columna nueva" placeholder="Ej: Luces" className="field w-48 py-2" />
        <SubmitButton className="btn-ghost btn-sm" pendingText="Sumando…">
          <Icon name="plus" className="h-3.5 w-3.5" />
          Sumar columna
        </SubmitButton>
      </form>
    </section>
  );
}

/**
 * The read-only schedule (couple portal and download) in the sheet's order: Horario, Horas, Minutos (unless hidden),
 * Duración, Actividad, Descripción. With `columns` (the team's download) it adds the team columns, and team-only
 * moments show marked.
 */
export function TimingSchedule({
  timing,
  showHoursMinutes = true,
  columns = [],
}: {
  timing: TimingItem[];
  showHoursMinutes?: boolean;
  columns?: TimingSettings["columns"];
}) {
  const durations = timingDurationLabels(timing);
  return (
    <section className="card space-y-3">
      <h3 className="section-title">Cronograma del día</h3>
      {timing.length === 0 ? (
        <p className="text-sm text-ink/50">Todavía no hay momentos cargados. Lo vamos armando con ustedes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wider text-ink/60 uppercase">
              <tr className="border-b border-forest/20">
                <th className="py-2 pr-3 font-semibold">Horario</th>
                {showHoursMinutes && (
                  <>
                    <th className="py-2 pr-3 font-semibold">Horas</th>
                    <th className="py-2 pr-3 font-semibold">Minutos</th>
                  </>
                )}
                <th className="py-2 pr-3 font-semibold">Duración</th>
                <th className="py-2 pr-3 font-semibold">Actividad</th>
                <th className="py-2 pr-3 font-semibold">Descripción</th>
                {columns.map((col) => (
                  <th key={col.id} className="py-2 pr-3 font-semibold text-rust">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-forest/10 align-top">
              {timing.map((t, i) => {
                const { hours, minutes } = durationParts(t.durationMin);
                return (
                  <tr key={t.id} className={t.teamOnly ? "bg-peach-soft" : ""}>
                    <td className="py-2 pr-3 font-semibold text-teal tabular-nums">{t.time}</td>
                    {showHoursMinutes && (
                      <>
                        <td className="py-2 pr-3 tabular-nums">{hours ?? ""}</td>
                        <td className="py-2 pr-3 tabular-nums">{minutes ?? ""}</td>
                      </>
                    )}
                    <td className="py-2 pr-3 whitespace-nowrap text-ink/70">{durations[i] ?? ""}</td>
                    <td className="py-2 pr-3 text-forest">
                      {t.title}
                      {t.teamOnly && <span className="chip ml-2 bg-peach py-0 text-rust">Solo equipo</span>}
                    </td>
                    <td className="py-2 pr-3 whitespace-pre-line text-ink/70">{t.note}</td>
                    {columns.map((col) => (
                      <td key={col.id} className="py-2 pr-3 whitespace-pre-line text-ink/70">
                        {t.team?.[col.id] ?? ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Read-only timeline, for the home card and summaries. */
export function TimingList({ timing, limit }: { timing: TimingItem[]; limit?: number }) {
  const durations = timingDurationLabels(timing);
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
          <ClockInput id="vt-time" />
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
              <AutoSaveForm compact save={actions.update} className={`min-w-0 flex-1 ${VENDOR_ROW}`}>
                <CoupleField coupleId={coupleId} />
                <input type="hidden" name="itemId" value={v.id} />
                <ClockInput defaultValue={v.time} className="py-2 font-semibold text-forest" />
                <input name="category" required maxLength={80} defaultValue={v.category} aria-label="Rubro" className="field py-2" />
                <input name="company" maxLength={120} defaultValue={v.company} aria-label="Empresa" placeholder="Empresa" className="field py-2" />
                <input name="contact" maxLength={200} defaultValue={v.contact} aria-label="Contacto" placeholder="Contacto" className="field py-2" />
              </AutoSaveForm>
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
