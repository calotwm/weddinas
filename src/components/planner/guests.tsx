"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { Guest, GuestStatus } from "@/core/couple";
import { GUEST_AGE_LABEL, GUEST_AGES, GUEST_STATUS_LABEL, GUEST_STATUSES, guestDisplayName, guestFormKey, sortGuests } from "@/core/guests";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

export type GuestImportState = { error?: string; ok?: number; message?: string } | null;

export interface GuestActions {
  add: (formData: FormData) => Promise<void>;
  addList: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  importList: (prev: GuestImportState, formData: FormData) => Promise<GuestImportState>;
  /** Team only: the attendance tick on the day ("Llegó"). The couple's portal leaves it out. */
  setArrived?: (formData: FormData) => Promise<void>;
}

/** Hidden couple id for the team's actions; the couple's actions read it from the session instead. */
function CoupleField({ coupleId }: { coupleId?: string }) {
  return coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;
}

const STATUS_TONE: Record<GuestStatus, string> = {
  confirmed: "bg-mint/25 text-forest",
  pending: "bg-peach text-forest",
  sent: "bg-teal/15 text-forest",
  declined: "bg-ink/8 text-ink/60",
};

/** The same palette on the status select itself; important so it wins over the field's white background. */
const STATUS_FIELD_TONE: Record<GuestStatus, string> = {
  confirmed: "!bg-mint/25 !text-forest",
  pending: "!bg-peach !text-forest",
  sent: "!bg-teal/15 !text-forest",
  declined: "!bg-ink/8 !text-ink/60",
};

const ROW = "grid gap-2 grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_10rem_7rem_1fr_auto] lg:items-center";

/** Tinted with the color of the picked status, following the user's choice and the form's reset after saving. */
function StatusSelect({ id, defaultValue }: { id?: string; defaultValue: GuestStatus }) {
  const [status, setStatus] = useState(defaultValue);
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    // "reset" fires before the fields go back to their defaults, so read the value once it is done.
    const onReset = () => setTimeout(() => ref.current && setStatus(ref.current.value as GuestStatus));
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  return (
    <select
      ref={ref}
      id={id}
      name="status"
      defaultValue={defaultValue}
      onChange={(e) => setStatus(e.target.value as GuestStatus)}
      aria-label={id ? undefined : "Estado"}
      className={`field py-2 font-semibold ${STATUS_FIELD_TONE[status]}`}
    >
      {GUEST_STATUSES.map((s) => (
        <option key={s} value={s}>{GUEST_STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

function AgeSelect({ id, defaultValue }: { id?: string; defaultValue?: string }) {
  return (
    <select id={id} name="age" defaultValue={defaultValue ?? ""} aria-label={id ? undefined : "Edad"} className="field py-2">
      <option value="">Edad: sin dato</option>
      {GUEST_AGES.map((a) => (
        <option key={a} value={a}>{GUEST_AGE_LABEL[a]}</option>
      ))}
    </select>
  );
}

/** Edad, invitado de, combi and teléfono: the less used columns of the agency's sheet. */
function ExtraFields({ guest, idPrefix }: { guest?: Guest; idPrefix?: string }) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : undefined);
  const labelled = (name: string, label: string, input: React.ReactNode) =>
    idPrefix ? (
      <div>
        <label htmlFor={id(name)} className="label">{label}</label>
        {input}
      </div>
    ) : (
      input
    );
  return (
    <>
      {labelled("age", "Edad", <AgeSelect id={id("age")} defaultValue={guest?.age} />)}
      {labelled("side", "Invitado de", <input id={id("side")} name="side" maxLength={80} defaultValue={guest?.side} aria-label={idPrefix ? undefined : "Invitado de"} placeholder="Invitado de" className="field py-2" />)}
      {labelled("transport", "Combi", <input id={id("transport")} name="transport" maxLength={80} defaultValue={guest?.transport} aria-label={idPrefix ? undefined : "Combi"} placeholder="Combi" className="field py-2" />)}
      {labelled("phone", "Teléfono", <input id={id("phone")} name="phone" type="tel" maxLength={40} defaultValue={guest?.phone} aria-label={idPrefix ? undefined : "Teléfono"} placeholder="Teléfono" className="field py-2" />)}
    </>
  );
}

/** The team's "Llegó" tick: posts on change, so attendance is one tap per guest. */
function ArrivedToggle({ guest, coupleId, action }: { guest: Guest; coupleId?: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex items-center self-center">
      <CoupleField coupleId={coupleId} />
      <input type="hidden" name="guestId" value={guest.id} />
      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-forest">
        <input
          type="checkbox"
          name="arrived"
          value="yes"
          defaultChecked={Boolean(guest.arrived)}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="h-4 w-4 accent-forest"
        />
        Llegó
      </label>
    </form>
  );
}

function GuestRow({ guest, number, actions, coupleId }: { guest: Guest; number: number; actions: GuestActions; coupleId?: string }) {
  const name = guestDisplayName(guest);
  return (
    <li className="flex flex-wrap items-start gap-2 rounded-2xl p-2 ring-1 ring-forest/5 lg:items-center">
      <span className="w-7 shrink-0 self-center text-right text-sm font-semibold tabular-nums text-ink/50" aria-label={`Invitado ${number}`}>
        {number}
      </span>
      <form action={actions.update} className={`min-w-0 flex-1 ${ROW}`}>
        <CoupleField coupleId={coupleId} />
        <input type="hidden" name="guestId" value={guest.id} />
        <input name="lastName" maxLength={80} defaultValue={guest.lastName} aria-label="Apellido" placeholder="Apellido" className="field py-2 font-semibold text-forest" />
        <input name="name" required maxLength={120} defaultValue={guest.name} aria-label="Nombre" placeholder="Nombre" className="field py-2 font-semibold text-forest" />
        <input name="group" maxLength={80} defaultValue={guest.group} aria-label="Relación" placeholder="Relación" className="field py-2" />
        <StatusSelect defaultValue={guest.status} />
        <input name="table" maxLength={40} defaultValue={guest.table} aria-label="Mesa" placeholder="Mesa" className="field py-2" />
        <input name="restriction" maxLength={120} defaultValue={guest.restriction} aria-label="Menú" placeholder="Menú" className="field py-2" />
        <SubmitButton className="btn-ghost btn-sm" pendingText="…" doneText="¡Listo!">
          <Icon name="check" className="h-3.5 w-3.5" />
          Guardar
        </SubmitButton>
        <details className="col-span-full">
          <summary className="cursor-pointer text-xs font-semibold text-teal">Más datos</summary>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <ExtraFields guest={guest} />
          </div>
        </details>
      </form>
      {/* Keyed by the stored tick for the same reason as the row form: the reset after saving goes back to the mounted default. */}
      {actions.setArrived && <ArrivedToggle key={guest.arrived ? "in" : "out"} guest={guest} coupleId={coupleId} action={actions.setArrived} />}
      <form action={actions.remove}>
        <CoupleField coupleId={coupleId} />
        <input type="hidden" name="guestId" value={guest.id} />
        <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar a ${name} de la lista?`}>
          <Icon name="trash" className="h-4 w-4" />
          <span className="sr-only">Quitar a {name}</span>
        </SubmitButton>
      </form>
    </li>
  );
}

/** Excel import (the agency's "Lista de invitados"): adds to the list or replaces it after confirming. */
function GuestImport({ actions, coupleId, count }: { actions: GuestActions; coupleId?: string; count: number }) {
  const [state, action] = useActionState(actions.importList, null);
  const team = Boolean(coupleId);
  return (
    <form action={action} className="card flex flex-col gap-3 lg:col-span-2">
      <CoupleField coupleId={coupleId} />
      <div>
        <h3 className="section-title">Importar desde Excel</h3>
        <p className="text-sm text-ink/60">
          {team ? "Subí" : "Suban"} la lista en .xlsx (hasta 5 MB). Leemos las columnas APELLIDO, NOMBRE, EDAD, RSVP, MESA, MENÚ, COMBI, RELACIÓN, INVITADO y TELEFONO.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="g-import" className="sr-only">Archivo de Excel</label>
        <input
          id="g-import"
          name="file"
          type="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="min-w-0 flex-1 text-sm"
        />
        <SubmitButton className="btn-ghost btn-sm" pendingText="Importando…" name="mode" value="add">
          <Icon name="plus" className="h-3.5 w-3.5" />
          Agregar a la lista
        </SubmitButton>
        <SubmitButton
          className="btn-ghost btn-sm"
          pendingText="Importando…"
          name="mode"
          value="replace"
          confirm={count > 0 ? `¿Reemplazar la lista? Se borran los ${count} invitados cargados y quedan los del Excel.` : undefined}
        >
          Reemplazar la lista
        </SubmitButton>
      </div>
      {state?.error && <p role="alert" className="text-sm text-rust">{state.error}</p>}
      {state?.message && <p role="status" className="text-sm text-forest">{state.message}</p>}
    </form>
  );
}

/** Table filter value for guests without a table (a table name is never blank). */
const NO_TABLE = " ";

/** Distinct tables in natural order ("2" before "10", names after numbers). */
function tableNames(guests: Guest[]): string[] {
  const names = [...new Set(guests.map((g) => g.table.trim()).filter(Boolean))];
  return names.sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}

/** Guest list: add one, paste many (one per line), import the Excel, edit inline, delete and filter by status and table. */
export function GuestManager({ guests, actions, coupleId }: { guests: Guest[]; actions: GuestActions; coupleId?: string }) {
  const [filter, setFilter] = useState<GuestStatus | "all">("all");
  const [table, setTable] = useState("");
  const sorted = useMemo(() => sortGuests(guests), [guests]);
  const tables = useMemo(() => tableNames(guests), [guests]);
  const unseated = useMemo(() => guests.filter((g) => !g.table.trim()).length, [guests]);
  const visible = useMemo(
    () =>
      sorted.filter(
        (g) => (filter === "all" || g.status === filter) && (!table || (table === NO_TABLE ? !g.table.trim() : g.table.trim() === table)),
      ),
    [sorted, filter, table],
  );
  const counts = useMemo(() => Object.fromEntries(GUEST_STATUSES.map((s) => [s, guests.filter((g) => g.status === s).length])), [guests]);
  const arrived = useMemo(() => guests.filter((g) => g.arrived).length, [guests]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={actions.add} className="card grid gap-3 grid-cols-2">
          <CoupleField coupleId={coupleId} />
          <h3 className="section-title col-span-2">Sumar invitado</h3>
          <div>
            <label htmlFor="g-name" className="label">Nombre</label>
            <input id="g-name" name="name" required maxLength={120} placeholder="Ej: Ana" className="field" />
          </div>
          <div>
            <label htmlFor="g-lastName" className="label">Apellido</label>
            <input id="g-lastName" name="lastName" maxLength={80} placeholder="Ej: Pérez" className="field" />
          </div>
          <div>
            <label htmlFor="g-group" className="label">Relación</label>
            <input id="g-group" name="group" maxLength={80} placeholder="Ej: Amigos" className="field" />
          </div>
          <div>
            <label htmlFor="g-status" className="label">Estado</label>
            <StatusSelect id="g-status" defaultValue="pending" />
          </div>
          <div>
            <label htmlFor="g-table" className="label">Mesa</label>
            <input id="g-table" name="table" maxLength={40} placeholder="Ej: 4" className="field" />
          </div>
          <div>
            <label htmlFor="g-restriction" className="label">Menú</label>
            <input id="g-restriction" name="restriction" maxLength={120} placeholder="Ej: Celíaco, vegano" className="field" />
          </div>
          <ExtraFields idPrefix="g" />
          <div className="col-span-2">
            <SubmitButton pendingText="Sumando…">
              <Icon name="plus" className="h-4 w-4" />
              Sumar
            </SubmitButton>
          </div>
        </form>

        <form action={actions.addList} className="card flex flex-col gap-3">
          <CoupleField coupleId={coupleId} />
          <div>
            <h3 className="section-title">Pegar una lista</h3>
            <p className="text-sm text-ink/60">Un nombre por renglón. Quedan como pendientes; después se completa mesa y menú.</p>
          </div>
          <div>
            <label htmlFor="g-names" className="label">Nombres</label>
            <textarea id="g-names" name="names" required rows={6} maxLength={60000} placeholder={"Ana Pérez\nJuan Gómez\nSofía Ruiz"} className="field" />
          </div>
          <div>
            <label htmlFor="g-list-group" className="label">Relación (opcional, para todos)</label>
            <input id="g-list-group" name="group" maxLength={80} placeholder="Ej: Familia de la novia" className="field" />
          </div>
          <div>
            <SubmitButton pendingText="Sumando…">
              <Icon name="plus" className="h-4 w-4" />
              Sumar lista
            </SubmitButton>
          </div>
        </form>

        <GuestImport actions={actions} coupleId={coupleId} count={guests.length} />
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-title">
            Lista ({guests.length})
            {actions.setArrived && <span className="ml-2 text-sm font-semibold text-teal">{arrived} {arrived === 1 ? "llegó" : "llegaron"}</span>}
          </h3>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
            {(["all", ...GUEST_STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
                className={`chip cursor-pointer py-1.5 transition-colors ${filter === s ? "bg-forest text-cream" : s === "all" ? "bg-sand text-forest" : STATUS_TONE[s]}`}
              >
                {s === "all" ? `Todos (${guests.length})` : `${GUEST_STATUS_LABEL[s]} (${counts[s]})`}
              </button>
            ))}
          </div>
        </div>
        {(tables.length > 0 || table) && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="g-table-filter" className="text-sm font-semibold text-forest">Ver mesa</label>
            <select id="g-table-filter" value={table} onChange={(e) => setTable(e.target.value)} className="field !w-auto py-2">
              <option value="">Todas las mesas</option>
              {tables.map((t) => (
                <option key={t} value={t}>
                  Mesa {t} ({guests.filter((g) => g.table.trim() === t).length})
                </option>
              ))}
              {unseated > 0 && <option value={NO_TABLE}>Sin mesa ({unseated})</option>}
            </select>
          </div>
        )}
        {visible.length === 0 ? (
          <p className="text-sm text-ink/50">{guests.length === 0 ? "Todavía no hay invitados cargados." : "Nadie con ese filtro."}</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((g, i) => (
              // Keyed by the saved values so a saved row remounts with them (see guestFormKey).
              <GuestRow key={guestFormKey(g)} guest={g} number={i + 1} actions={actions} coupleId={coupleId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
