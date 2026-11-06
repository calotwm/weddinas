import type { GuestSummary, Tally } from "@/core/guests";

function TallyList({ title, items, empty }: { title: string; items: Tally[]; empty: string }) {
  return (
    <div>
      <p className="label">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-ink/50">{empty}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <li key={t.name} className="chip bg-sand text-forest">
              {t.name} <span className="font-semibold">{t.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Confirmed share plus tables and dietary restrictions (declined guests are left out of every count but "No vienen"). */
export function GuestSummaryView({ summary, compact = false }: { summary: GuestSummary; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-5xl text-forest">{summary.confirmedPercent}%</p>
          <p className="text-sm text-ink/60">confirmados</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={summary.confirmedPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-mint to-teal" style={{ width: `${summary.confirmedPercent}%` }} />
        </div>
        <p className="mt-2 text-sm text-ink/60">
          {summary.confirmed} de {summary.expected} invitados · {summary.pending} pendiente{summary.pending === 1 ? "" : "s"} · {summary.declined} no viene{summary.declined === 1 ? "" : "n"}
        </p>
      </div>
      <TallyList
        title={`Mesas${summary.unseated ? ` · ${summary.unseated} sin mesa` : ""}`}
        items={compact ? summary.tables.slice(0, 8) : summary.tables}
        empty="Todavía no hay mesas asignadas."
      />
      <TallyList title="Restricciones alimentarias" items={summary.restrictions} empty="Nadie cargó restricciones." />
    </div>
  );
}
