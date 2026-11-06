import Link from "next/link";
import { StatusChip } from "@/components/planner/brief";
import { coupleNames } from "@/core/couple";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

export default async function CivilAdminPage() {
  await requireAdmin();
  const couples = (await portal.listCouples()).sort((a, b) => a.weddingDate.localeCompare(b.weddingDate));
  const rows = couples.map((couple) => ({ couple, block: couple.brief.find((b) => b.key === "civil") ?? null }));

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Civil</h1>
        <p className="mt-2 text-sm text-ink/60">Los datos del civil de cada pareja, ordenados por fecha de casamiento. Se editan en el brief.</p>
      </div>

      {rows.length === 0 ? (
        <p className="card py-10 text-center text-ink/50">Todavía no hay parejas cargadas.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ couple, block }) => {
            const filled = block?.fields.filter((f) => f.detail.trim()) ?? [];
            return (
              <section key={couple.id} className="card space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/admin/parejas/${couple.id}/brief`} className="font-semibold text-forest underline-offset-4 hover:underline">
                      {coupleNames(couple)}
                    </Link>
                    <p className="text-xs text-ink/55">Casamiento: {formatShortDate(weddingDateToIso(couple.weddingDate))}</p>
                  </div>
                  {block && <StatusChip status={block.status} />}
                </div>
                {filled.length === 0 ? (
                  <p className="text-sm text-ink/45">{block ? "Sin datos del civil todavía." : "El brief no tiene la sección Civil."}</p>
                ) : (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                    {filled.map((f) => (
                      <div key={f.label} className="contents">
                        <dt className="text-ink/55">{f.label}</dt>
                        <dd className="whitespace-pre-line text-ink/85">{f.detail}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
