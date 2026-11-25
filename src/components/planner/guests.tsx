"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import type { Guest, GuestStatus } from "@/core/couple";
import {
  arrivalCounts,
  filterGuests,
  GUEST_AGE_LABEL,
  GUEST_AGES,
  GUEST_STATUS_LABEL,
  GUEST_STATUSES,
  guestDisplayName,
  isMissing,
  MAX_GUEST_NOTES,
  MISSING_FIELD_LABEL,
  MISSING_FIELDS,
  sortGuests,
  type MissingField,
} from "@/core/guests";
import { AutoSaveForm } from "../auto-save-form";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

export type GuestImportState = { error?: string; ok?: number; message?: string } | null;

export interface GuestActions {
  add: (formData: FormData) => Promise<void>;
  /** Called by each row's autosave; it should throw when the save fails. */
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
  importList: (prev: GuestImportState, formData: FormData) => Promise<GuestImportState>;
  /** Team only: the attendance tick on the day ("Llegó"). The couple's portal leaves it out. It should throw on failure. */
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

/** Apellido, Nombre, Edad, RSVP, Mesa, Menú, Combi, Teléfono, Notas; wraps in two or three columns on smaller screens. */
const ROW = "grid gap-2 grid-cols-2 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_8rem_9rem_5rem_1fr_1fr_8rem_1fr] xl:items-center";

/**
 * AutoSaveForm's status line is a floating pill meant for one form per page. In a row it sits under the fields,
 * small, and only shows "¡Guardado!" or the error (the idle and saving states share the white background).
 */
const ROW_STATUS =
  "[&>p:last-child]:static [&>p:last-child]:col-span-full [&>p:last-child]:px-2 [&>p:last-child]:py-0.5 [&>p:last-child]:text-xs [&>p:last-child]:shadow-none [&>p:last-child.bg-white]:hidden";

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
      aria-label={id ? undefined : "RSVP"}
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

/**
 * The team's "Llegó" tick. A controlled checkbox that calls the action directly in a transition with an optimistic
 * value: no form, so React never runs its native form reset (which bypassed its change tracking and swallowed the next
 * tap), and a failed save reverts the tick and says so instead of failing silently.
 */
function ArrivedToggle({ guest, coupleId, action }: { guest: Guest; coupleId?: string; action: (formData: FormData) => Promise<void> }) {
  const [arrived, setArrived] = useOptimistic(Boolean(guest.arrived));
  const [, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const name = guestDisplayName(guest);

  const toggle = (next: boolean) => {
    setFailed(false);
    startTransition(async () => {
      setArrived(next);
      const data = new FormData();
      if (coupleId) data.set("coupleId", coupleId);
      data.set("guestId", guest.id);
      if (next) data.set("arrived", "yes");
      try {
        await action(data);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <label className="flex cursor-pointer flex-col items-center gap-0.5 text-[0.65rem] font-semibold text-forest">
      <input
        type="checkbox"
        checked={arrived}
        onChange={(e) => toggle(e.target.checked)}
        aria-label={`Llegó ${name}`}
        className="h-5 w-5 accent-forest"
      />
      Llegó
      {failed && (
        <span role="alert" className="text-rust">
          Error
        </span>
      )}
    </label>
  );
}

/** Relación and Invitado de: the less used columns of the agency's sheet. */
function MoreFields({ guest, idPrefix }: { guest?: Guest; idPrefix?: string }) {
  const id = (name: string) => (idPrefix ? `${idPrefix}-${name}` : undefined);
  const field = (name: "group" | "side", label: string, placeholder: string) => (
    <div>
      {idPrefix && (
        <label htmlFor={id(name)} className="label">
          {label}
        </label>
      )}
      <input
        id={id(name)}
        name={name}
        maxLength={80}
        defaultValue={guest?.[name]}
        aria-label={idPrefix ? undefined : label}
        placeholder={placeholder}
        className="field py-2"
      />
    </div>
  );
  return (
    <details className="col-span-full">
      <summary className="cursor-pointer text-xs font-semibold text-teal">Más datos</summary>
      <div className="mt-2 grid grid-cols-2 gap-2 lg:max-w-xl">
        {field("group", "Relación", idPrefix ? "Ej: Amigos" : "Relación")}
        {field("side", "Invitado de", "Invitado de")}
      </div>
    </details>
  );
}

function GuestRow({ guest, number, actions, coupleId }: { guest: Guest; number: number; actions: GuestActions; coupleId?: string }) {
  const name = guestDisplayName(guest);
  return (
    <li className="flex items-start gap-2 rounded-2xl p-2 ring-1 ring-forest/5">
      <div className="flex w-9 shrink-0 flex-col items-center gap-1 pt-2">
        <span className="text-sm font-semibold tabular-nums text-ink/50" aria-label={`Invitado ${number}`}>
          {number}
        </span>
        {actions.setArrived && <ArrivedToggle guest={guest} coupleId={coupleId} action={actions.setArrived} />}
      </div>
      <AutoSaveForm save={actions.update} className={`min-w-0 flex-1 ${ROW} ${ROW_STATUS}`}>
        <CoupleField coupleId={coupleId} />
        <input type="hidden" name="guestId" value={guest.id} />
        <input name="lastName" maxLength={80} defaultValue={guest.lastName} aria-label="Apellido" placeholder="Apellido" className="field py-2 font-semibold text-forest" />
        <input name="name" required maxLength={120} defaultValue={guest.name} aria-label="Nombre" placeholder="Nombre" className="field py-2 font-semibold text-forest" />
        <AgeSelect defaultValue={guest.age} />
        <StatusSelect defaultValue={guest.status} />
        <input name="table" maxLength={40} defaultValue={guest.table} aria-label="Mesa" placeholder="Mesa" className="field py-2" />
        <input name="restriction" maxLength={120} defaultValue={guest.restriction} aria-label="Menú" placeholder="Menú" className="field py-2" />
        <input name="transport" maxLength={80} defaultValue={guest.transport} aria-label="Combi" placeholder="Combi" className="field py-2" />
        <input name="phone" type="tel" maxLength={40} defaultValue={guest.phone} aria-label="Teléfono" placeholder="Teléfono" className="field py-2" />
        <input name="notes" maxLength={MAX_GUEST_NOTES} defaultValue={guest.notes} aria-label="Notas" placeholder="Notas" className="field py-2" />
        <MoreFields guest={guest} />
      </AutoSaveForm>
      <form action={actions.remove} className="pt-1">
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
    <form action={action} className="card flex flex-col gap-3">
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

/** Distinct tables in natural order ("2" before "10", names after numbers). */
function tableNames(guests: Guest[]): string[] {
  const names = [...new Set(guests.map((g) => g.table.trim()).filter(Boolean))];
  return names.sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}

function AddGuestForm({ actions, coupleId }: { actions: GuestActions; coupleId?: string }) {
  const labelled = (id: string, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {input}
    </div>
  );
  return (
    <form action={actions.add} className="card grid gap-3 grid-cols-2">
      <CoupleField coupleId={coupleId} />
      <h3 className="section-title col-span-2">Sumar invitado</h3>
      {labelled("g-lastName", "Apellido", <input id="g-lastName" name="lastName" maxLength={80} placeholder="Ej: Pérez" className="field" />)}
      {labelled("g-name", "Nombre", <input id="g-name" name="name" required maxLength={120} placeholder="Ej: Ana" className="field" />)}
      {labelled("g-age", "Edad", <AgeSelect id="g-age" />)}
      {labelled("g-status", "RSVP", <StatusSelect id="g-status" defaultValue="pending" />)}
      {labelled("g-table", "Mesa", <input id="g-table" name="table" maxLength={40} placeholder="Ej: 4" className="field" />)}
      {labelled("g-restriction", "Menú", <input id="g-restriction" name="restriction" maxLength={120} placeholder="Ej: Celíaco, vegano" className="field" />)}
      {labelled("g-transport", "Combi", <input id="g-transport" name="transport" maxLength={80} placeholder="Combi" className="field" />)}
      {labelled("g-phone", "Teléfono", <input id="g-phone" name="phone" type="tel" maxLength={40} placeholder="Teléfono" className="field" />)}
      <div className="col-span-2">
        <label htmlFor="g-notes" className="label">Notas</label>
        <input id="g-notes" name="notes" maxLength={MAX_GUEST_NOTES} placeholder="Ej: Llega después de la ceremonia" className="field" />
      </div>
      <MoreFields idPrefix="g" />
      <div className="col-span-2">
        <SubmitButton pendingText="Sumando…">
          <Icon name="plus" className="h-4 w-4" />
          Sumar
        </SubmitButton>
      </div>
    </form>
  );
}

/** Guest list: add one, import the Excel, edit inline (saves on its own), delete, search and filter. */
export function GuestManager({ guests, actions, coupleId }: { guests: Guest[]; actions: GuestActions; coupleId?: string }) {
  const [status, setStatus] = useState<GuestStatus | "all">("all");
  const [table, setTable] = useState("");
  const [missing, setMissing] = useState<MissingField[]>([]);
  const [query, setQuery] = useState("");
  const sorted = useMemo(() => sortGuests(guests), [guests]);
  const tables = useMemo(() => tableNames(guests), [guests]);
  const visible = useMemo(() => filterGuests(sorted, { status, table, missing, query }), [sorted, status, table, missing, query]);
  const counts = useMemo(() => Object.fromEntries(GUEST_STATUSES.map((s) => [s, guests.filter((g) => g.status === s).length])), [guests]);
  const missingCounts = useMemo(
    () => Object.fromEntries(MISSING_FIELDS.map((f) => [f, guests.filter((g) => isMissing(g, f)).length])) as Record<MissingField, number>,
    [guests],
  );
  const attendance = useMemo(() => arrivalCounts(guests), [guests]);
  const toggleMissing = (field: MissingField) => setMissing((m) => (m.includes(field) ? m.filter((f) => f !== field) : [...m, field]));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AddGuestForm actions={actions} coupleId={coupleId} />
        <GuestImport actions={actions} coupleId={coupleId} count={guests.length} />
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="section-title">
              Lista ({guests.length})
              {actions.setArrived && (
                <span className="ml-2 text-sm font-semibold text-teal">
                  Ingresaron {attendance.arrived} · Faltan ingresar {attendance.missing}
                </span>
              )}
            </h3>
            <p className="text-xs text-ink/60">Los cambios de cada invitado se guardan solos.</p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por RSVP">
            {(["all", ...GUEST_STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`chip cursor-pointer py-1.5 transition-colors ${status === s ? "bg-forest text-cream" : s === "all" ? "bg-sand text-forest" : STATUS_TONE[s]}`}
              >
                {s === "all" ? `Todos (${guests.length})` : `${GUEST_STATUS_LABEL[s]} (${counts[s]})`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="g-search" className="sr-only">Buscar invitados</label>
          <input
            id="g-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, mesa, menú, combi, teléfono, notas…"
            className="field min-w-0 flex-1 py-2 sm:max-w-md"
          />
          {(tables.length > 0 || table) && (
            <>
              <label htmlFor="g-table-filter" className="text-sm font-semibold text-forest">Ver mesa</label>
              <select id="g-table-filter" value={table} onChange={(e) => setTable(e.target.value)} className="field !w-auto py-2">
                <option value="">Todas las mesas</option>
                {tables.map((t) => (
                  <option key={t} value={t}>
                    Mesa {t} ({guests.filter((g) => g.table.trim() === t).length})
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por datos vacíos">
          {MISSING_FIELDS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={missing.includes(f)}
              onClick={() => toggleMissing(f)}
              className={`chip cursor-pointer py-1.5 transition-colors ${missing.includes(f) ? "bg-forest text-cream" : "bg-sand text-forest"}`}
            >
              {MISSING_FIELD_LABEL[f]} ({missingCounts[f]})
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-ink/50">{guests.length === 0 ? "Todavía no hay invitados cargados." : "Nadie con ese filtro."}</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((g, i) => (
              // Keyed by id only: the row saves on its own without a form reset, so it must not remount (and lose
              // what is being typed) when the saved values come back.
              <GuestRow key={g.id} guest={g} number={i + 1} actions={actions} coupleId={coupleId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
