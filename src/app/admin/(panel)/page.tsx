import Link from "next/link";
import { coupleNames } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { portal } from "@/server/container";
import { CreateCoupleForm } from "../forms";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const couples = await portal.listCouples();

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section>
        <p className="eyebrow">Panel del equipo</p>
        <h1 className="mt-1 mb-6 font-display text-4xl text-forest">Parejas activas ({couples.length})</h1>

        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-[0.15em] text-forest uppercase">
              <tr className="border-b border-forest/10">
                <th className="px-5 py-4">Pareja</th>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Faltan</th>
                <th className="px-5 py-4">Propuestas</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {couples.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-6 text-ink/60">Todavía no hay parejas cargadas.</td></tr>
              )}
              {couples.map((c) => {
                const { days, isPast } = getCountdown(new Date(weddingDateToIso(c.weddingDate)));
                const pending = c.proposals.filter((p) => p.status === "pending").length;
                return (
                  <tr key={c.id} className="border-b border-forest/5 last:border-0 hover:bg-peach-soft/50">
                    <td className="px-5 py-4 font-display text-lg text-forest">
                      <Link href={`/admin/parejas/${c.id}`}>{coupleNames(c)}</Link>
                    </td>
                    <td className="px-5 py-4">{formatShortDate(weddingDateToIso(c.weddingDate))}</td>
                    <td className="px-5 py-4">{isPast ? "¡Ya fue!" : `${days} días`}</td>
                    <td className="px-5 py-4">
                      {pending > 0 ? <span className="rounded-full bg-peach px-2 py-0.5 text-rust">{pending} pendientes</span> : "—"}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link href={`/boda/${c.slug}`} target="_blank" className="mr-4 text-teal hover:underline">Página ↗</Link>
                      <Link href={`/admin/parejas/${c.id}`} className="text-forest hover:underline">Gestionar →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="card h-fit">
        <h2 className="mb-4 font-display text-2xl text-forest">Nueva pareja</h2>
        <CreateCoupleForm />
      </aside>
    </div>
  );
}
