import Link from "next/link";
import { coupleNames } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { categoryName } from "@/core/brief-catalog";
import { proposalGroups, type ProposalListKind } from "@/core/proposal-list";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: ProposalListKind; label: string; empty: string }> = [
  { value: "pending", label: "Sin responder", empty: "No hay propuestas esperando respuesta." },
  { value: "answered", label: "Respondidas", empty: "Todavía no hay propuestas respondidas." },
];

/** The proposals behind the home counters, per couple; `?estado=respondidas` shows the answered ones. */
export default async function ProposalsAdminPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdmin();
  const kind: ProposalListKind = (await searchParams).estado === "respondidas" ? "answered" : "pending";
  const couples = await portal.listCouples();
  // Same couples as the home counter: unanswered ones only count for weddings still ahead.
  const scope = kind === "pending" ? couples.filter((c) => !getCountdown(new Date(weddingDateToIso(c.weddingDate))).isPast) : couples;
  const groups = proposalGroups(scope, kind);
  const total = groups.reduce((n, g) => n + g.proposals.length, 0);
  const filter = FILTERS.find((f) => f.value === kind)!;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Propuestas</h1>
      </div>

      <nav aria-label="Filtrar propuestas" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === kind;
          return (
            <Link
              key={f.value}
              href={f.value === "pending" ? "/admin/propuestas" : "/admin/propuestas?estado=respondidas"}
              aria-current={active ? "page" : undefined}
              className={`chip normal-case tracking-normal transition-colors ${active ? "bg-forest text-cream" : "bg-sand text-forest hover:bg-peach-soft"}`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {groups.length === 0 ? (
        <p className="card py-10 text-center text-ink/50">{filter.empty}</p>
      ) : (
        <>
          <p className="text-sm text-ink/60">{total === 1 ? "1 propuesta" : `${total} propuestas`}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map(({ couple, proposals }) => (
              <section key={couple.id} className="card space-y-3">
                <div>
                  <Link href={`/admin/parejas/${couple.id}#propuestas`} className="font-semibold text-forest underline-offset-4 hover:underline">
                    {coupleNames(couple)}
                  </Link>
                  <p className="text-xs text-ink/55">Casamiento: {formatShortDate(weddingDateToIso(couple.weddingDate))}</p>
                </div>
                <ul className="divide-y divide-forest/8 text-sm">
                  {proposals.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                      <Link href={`/admin/parejas/${couple.id}#propuestas`} className="min-w-0 flex-1 hover:underline">
                        <span className="font-medium text-ink/85">{p.title}</span>
                        {p.category && <span className="text-ink/55"> · {categoryName(p.category, couple.brief)}</span>}
                      </Link>
                      <span className="text-xs text-ink/55">
                        {kind === "pending"
                          ? p.presentedAt && `Presentada el ${formatShortDate(p.presentedAt)}`
                          : `${p.status === "approved" ? "Aprobada" : "Rechazada"}${p.respondedAt ? ` el ${formatShortDate(p.respondedAt)}` : ""}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
