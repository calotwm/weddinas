import Link from "next/link";
import { commissionGroups } from "@/core/commissions";
import { coupleNames } from "@/core/couple";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";

export const dynamic = "force-dynamic";

/** What the team wrote in each vendor rubro's "Equipo" row, per couple, soonest wedding first. Team only. */
export default async function CommissionsAdminPage() {
  await requireAdmin();
  const couples = (await portal.listCouples()).sort((a, b) => a.weddingDate.localeCompare(b.weddingDate));
  const groups = commissionGroups(couples);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 font-display text-4xl text-forest sm:text-5xl">Comisiones</h1>
        <p className="mt-2 text-sm text-ink/60">
          Lo que dice la fila &quot;Equipo&quot; de cada proveedor en el brief, por pareja. Esa fila no la ven los novios ni sale en las hojas de proveedores.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="card py-10 text-center text-ink/50">Todavía no hay nada cargado en la fila &quot;Equipo&quot; de ningún brief.</p>
      ) : (
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
                {lines.map((line) => (
                  <li key={line.blockKey} className="py-2">
                    <Link href={`/admin/parejas/${couple.id}/brief`} className="hover:underline">
                      <span className="font-medium text-ink/85">{line.blockName}</span>
                      {line.vendor && <span className="text-ink/55"> · {line.vendor}</span>}
                    </Link>
                    <span className="block whitespace-pre-line text-ink/70">{line.detail}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
