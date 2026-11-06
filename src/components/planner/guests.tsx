"use client";

import { useMemo, useState } from "react";
import type { Guest, GuestStatus } from "@/core/couple";
import { GUEST_STATUS_LABEL, GUEST_STATUSES } from "@/core/guests";
import { Icon } from "../icons";
import { SubmitButton } from "../submit-button";

export interface GuestActions {
  add: (formData: FormData) => Promise<void>;
  addList: (formData: FormData) => Promise<void>;
  update: (formData: FormData) => Promise<void>;
  remove: (formData: FormData) => Promise<void>;
}

/** Hidden couple id for the team's actions; the couple's actions read it from the session instead. */
function CoupleField({ coupleId }: { coupleId?: string }) {
  return coupleId ? <input type="hidden" name="coupleId" value={coupleId} /> : null;
}

const STATUS_TONE: Record<GuestStatus, string> = {
  confirmed: "bg-mint/25 text-forest",
  pending: "bg-peach text-forest",
  declined: "bg-ink/8 text-ink/60",
};

const ROW = "grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_8.5rem_6rem_1fr_auto] lg:items-center";

function StatusSelect({ id, defaultValue }: { id?: string; defaultValue: GuestStatus }) {
  return (
    <select id={id} name="status" defaultValue={defaultValue} aria-label={id ? undefined : "Estado"} className="field py-2">
      {GUEST_STATUSES.map((s) => (
        <option key={s} value={s}>{GUEST_STATUS_LABEL[s]}</option>
      ))}
    </select>
  );
}

function GuestRow({ guest, actions, coupleId }: { guest: Guest; actions: GuestActions; coupleId?: string }) {
  return (
    <li className="flex flex-wrap items-start gap-2 rounded-2xl p-2 ring-1 ring-forest/5 lg:items-center">
      <form action={actions.update} className={`min-w-0 flex-1 ${ROW}`}>
        <CoupleField coupleId={coupleId} />
        <input type="hidden" name="guestId" value={guest.id} />
        <input name="name" required maxLength={120} defaultValue={guest.name} aria-label="Nombre" className="field py-2 font-semibold text-forest" />
        <input name="group" maxLength={80} defaultValue={guest.group} aria-label="Grupo" placeholder="Grupo" className="field py-2" />
        <StatusSelect defaultValue={guest.status} />
        <input name="table" maxLength={40} defaultValue={guest.table} aria-label="Mesa" placeholder="Mesa" className="field py-2" />
        <input name="restriction" maxLength={120} defaultValue={guest.restriction} aria-label="Restricción alimentaria" placeholder="Restricción" className="field py-2" />
        <SubmitButton className="btn-ghost btn-sm" pendingText="…" doneText="¡Listo!">
          <Icon name="check" className="h-3.5 w-3.5" />
          Guardar
        </SubmitButton>
      </form>
      <form action={actions.remove}>
        <CoupleField coupleId={coupleId} />
        <input type="hidden" name="guestId" value={guest.id} />
        <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Quitar a ${guest.name} de la lista?`}>
          <Icon name="trash" className="h-4 w-4" />
          <span className="sr-only">Quitar a {guest.name}</span>
        </SubmitButton>
      </form>
    </li>
  );
}

/** Guest list: add one, paste many (one per line), edit inline, delete and filter by status. */
export function GuestManager({ guests, actions, coupleId }: { guests: Guest[]; actions: GuestActions; coupleId?: string }) {
  const [filter, setFilter] = useState<GuestStatus | "all">("all");
  const visible = useMemo(() => (filter === "all" ? guests : guests.filter((g) => g.status === filter)), [guests, filter]);
  const counts = useMemo(() => Object.fromEntries(GUEST_STATUSES.map((s) => [s, guests.filter((g) => g.status === s).length])), [guests]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={actions.add} className="card grid gap-3 sm:grid-cols-2">
          <CoupleField coupleId={coupleId} />
          <h3 className="section-title sm:col-span-2">Sumar invitado</h3>
          <div className="sm:col-span-2">
            <label htmlFor="g-name" className="label">Nombre</label>
            <input id="g-name" name="name" required maxLength={120} placeholder="Ej: Ana Pérez" className="field" />
          </div>
          <div>
            <label htmlFor="g-group" className="label">Grupo</label>
            <input id="g-group" name="group" maxLength={80} placeholder="Ej: Amigos facu" className="field" />
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
            <label htmlFor="g-restriction" className="label">Restricción alimentaria</label>
            <input id="g-restriction" name="restriction" maxLength={120} placeholder="Ej: Celíaco, vegano" className="field" />
          </div>
          <div className="sm:col-span-2">
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
            <p className="text-sm text-ink/60">Un nombre por renglón. Quedan como pendientes; después se completa mesa y restricción.</p>
          </div>
          <div>
            <label htmlFor="g-names" className="label">Nombres</label>
            <textarea id="g-names" name="names" required rows={6} maxLength={60000} placeholder={"Ana Pérez\nJuan Gómez\nSofía Ruiz"} className="field" />
          </div>
          <div>
            <label htmlFor="g-list-group" className="label">Grupo (opcional, para todos)</label>
            <input id="g-list-group" name="group" maxLength={80} placeholder="Ej: Familia de la novia" className="field" />
          </div>
          <div>
            <SubmitButton pendingText="Sumando…">
              <Icon name="plus" className="h-4 w-4" />
              Sumar lista
            </SubmitButton>
          </div>
        </form>
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-title">Lista ({guests.length})</h3>
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
        {visible.length === 0 ? (
          <p className="text-sm text-ink/50">{guests.length === 0 ? "Todavía no hay invitados cargados." : "Nadie con ese estado."}</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((g) => (
              <GuestRow key={g.id} guest={g} actions={actions} coupleId={coupleId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
