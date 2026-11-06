import Link from "next/link";
import { Icon } from "@/components/icons";
import { coupleNames } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { guestSummary } from "@/core/guests";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

/** Every couple's guest list at a glance, upcoming weddings first. */
export default async function AllGuestsPage() {
  await requireAdmin();
  const rows = (await portal.listCouples()).map((c) => ({
    id: c.id,
    names: coupleNames(c),
    date: formatShortDate(weddingDateToIso(c.weddingDate)),
    isPast: getCountdown(new Date(weddingDateToIso(c.weddingDate))).isPast,
    summary: guestSummary(c.guests),
  }));
  const upcoming = rows.filter((r) => !r.isPast);
  const past = rows.filter((r) => r.isPast);
  const totalGuests = upcoming.reduce((n, r) => n + r.summary.expected, 0);
  const totalConfirmed = upcoming.reduce((n, r) => n + r.summary.confirmed, 0);

  const table = (list: typeof rows) => (
    <ul className="divide-y divide-forest/6">
      {list.map(({ id, names, date, summary: s }) => (
        <li key={id} className="group relative flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 transition-colors hover:bg-peach-soft/50 sm:px-5">
          <div className="min-w-48 flex-1">
            <Link href={`/admin/parejas/${id}/invitados`} className="font-display text-xl text-forest after:absolute after:inset-0">
              {names}
            </Link>
            <p className="text-sm text-ink/55">{date}</p>
          </div>
          {s.total === 0 ? (
            <span className="chip bg-transparent text-ink/35">Sin lista cargada</span>
          ) : (
            <>
              <div className="w-36" title={`${s.confirmedPercent}% confirmados`}>
                <div className="h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${s.confirmedPercent}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-ink/60">
                  {s.confirmedPercent}% · {s.confirmed} de {s.expected}
                </p>
              </div>
              <span className={`chip ${s.pending ? "bg-peach text-forest" : "bg-mint/25 text-forest"}`}>
                {s.pending} pendiente{s.pending === 1 ? "" : "s"}
              </span>
              <span className="chip bg-sand text-forest">
                {s.tables.length} mesa{s.tables.length === 1 ? "" : "s"}
                {s.unseated > 0 && ` · ${s.unseated} sin mesa`}
              </span>
              <span className="chip bg-sand text-forest" title={s.restrictions.map((r) => `${r.name}: ${r.count}`).join(", ")}>
                {s.restrictions.reduce((n, r) => n + r.count, 0)} con restricciones
              </span>
            </>
          )}
          <Icon name="arrowRight" className="h-4 w-4 text-forest/30 transition-transform group-hover:translate-x-1 group-hover:text-forest" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-forest sm:text-5xl">Invitados</h1>
        <p className="mt-1 text-ink/60">
          Las listas de todas las parejas · {totalConfirmed} de {totalGuests} invitados confirmados en las próximas bodas.
        </p>
      </div>
      <section className="card p-0 sm:p-0">
        {upcoming.length ? table(upcoming) : <p className="px-5 py-10 text-center text-ink/50">No hay bodas próximas.</p>}
      </section>
      {past.length > 0 && (
        <details className="card p-0 sm:p-0">
          <summary className="cursor-pointer px-5 py-4 text-forest">Bodas que ya fueron ({past.length})</summary>
          {table(past)}
        </details>
      )}
    </div>
  );
}
