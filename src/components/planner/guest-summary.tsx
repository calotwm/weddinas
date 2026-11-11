import { GUEST_AGE_LABEL, GUEST_AGES, type GuestSummary, type Tally } from "@/core/guests";

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

/**
 * The blocks of the agency's sheet: confirmed share, composition by age, confirmations, guests per table and menu.
 * Declined guests are left out of the percent, tables and menu; age and confirmations count the whole list.
 */
export function GuestSummaryView({ summary, compact = false }: { summary: GuestSummary; compact?: boolean }) {
  const ages: Tally[] = [
    ...GUEST_AGES.map((a) => ({ name: GUEST_AGE_LABEL[a], count: summary.ages[a] })),
    { name: "Sin dato", count: summary.ages.unknown },
  ].filter((t) => t.count > 0);
  const confirmations: Tally[] = [
    { name: "Sí", count: summary.confirmed },
    { name: "No", count: summary.declined },
    { name: "Enviado", count: summary.sent },
    { name: "Sin enviar", count: summary.pending },
  ];

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
          {summary.confirmed} de {summary.expected} invitados · {summary.sent} enviado{summary.sent === 1 ? "" : "s"} sin respuesta · {summary.pending} sin enviar · {summary.declined} no viene{summary.declined === 1 ? "" : "n"}
        </p>
      </div>
      {!compact && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TallyList title={`Composición · ${summary.total} invitado${summary.total === 1 ? "" : "s"}`} items={ages} empty="Todavía no hay invitados." />
          <TallyList title="Confirmaciones" items={confirmations} empty="" />
        </div>
      )}
      <TallyList
        title={`Invitados por mesa${summary.unseated ? ` · ${summary.unseated} sin mesa` : ""}`}
        items={compact ? summary.tables.slice(0, 8) : summary.tables}
        empty="Todavía no hay mesas asignadas."
      />
      <TallyList title="Menú" items={summary.restrictions} empty="Nadie cargó restricciones de menú." />
    </div>
  );
}
