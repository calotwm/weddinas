import Link from "next/link";
import { LineStateChip } from "@/components/planner/line-state";
import { coupleNames, isPendingState, pendingBriefLines, type PendingState } from "@/core/couple";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: PendingState | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "weddinas", label: "Weddinas" },
  { value: "couple", label: "Novios" },
  { value: "vendor", label: "Proveedores" },
];

/** Brief lines still waiting on someone, across every couple; `?de=` narrows to Weddinas, the couple or a vendor. */
export default async function PendingAdminPage({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  await requireAdmin();
  const { de } = await searchParams;
  const filter = isPendingState(de) ? de : "all";
  const groups = pendingBriefLines(await portal.listCouples(), filter);
  const total = groups.reduce((n, g) => n + g.lines.length, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Pendientes</h1>
        <p className="mt-2 text-sm text-ink/60">
          Las líneas del brief que esperan a Weddinas, a los novios o a un proveedor, por pareja. Se marcan y se resuelven en el brief.
        </p>
      </div>

      <nav aria-label="Filtrar pendientes" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/admin/pendientes" : `/admin/pendientes?de=${f.value}`}
              aria-current={active ? "page" : undefined}
              className={`chip normal-case tracking-normal transition-colors ${active ? "bg-forest text-cream" : "bg-sand text-forest hover:bg-peach-soft"}`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {groups.length === 0 ? (
        <p className="card py-10 text-center text-ink/50">No hay pendientes{filter === "all" ? "" : " con este filtro"}.</p>
      ) : (
        <>
          <p className="text-sm text-ink/60">{total === 1 ? "1 pendiente" : `${total} pendientes`}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map(({ couple, lines }) => (
              <section key={couple.id} className="card space-y-3">
                <div>
                  <Link href={`/admin/parejas/${couple.id}/brief`} className="font-semibold text-forest underline-offset-4 hover:underline">
                    {coupleNames(couple)}
                  </Link>
                  <p className="text-xs text-ink/55">Casamiento: {formatShortDate(weddingDateToIso(couple.weddingDate))}</p>
                </div>
                <ul className="divide-y divide-forest/8 text-sm">
                  {lines.map((line, i) => (
                    <li key={`${line.blockKey}-${line.label}-${i}`} className="flex flex-wrap items-start justify-between gap-2 py-2">
                      <Link href={`/admin/parejas/${couple.id}/brief`} className="min-w-0 flex-1 hover:underline">
                        <span className="text-ink/55">{line.blockName} · </span>
                        <span className="font-medium text-ink/85">{line.label}</span>
                        {line.detail.trim() && <span className="block whitespace-pre-line text-ink/70">{line.detail}</span>}
                      </Link>
                      <LineStateChip state={line.state} />
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
