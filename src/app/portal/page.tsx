import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { formatShortDate, formatWeddingDate, weddingDateToIso } from "@/lib/format";
import { getCurrentCouple } from "./data";

export default async function PortalHome() {
  const couple = await getCurrentCouple();
  const pending = couple.proposals.filter((p) => p.status === "pending");
  const done = couple.tasks.filter((t) => t.done).length;
  const progress = couple.tasks.length ? Math.round((done / couple.tasks.length) * 100) : 0;
  const lastReport = couple.reports[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card bg-forest text-center lg:col-span-3">
        <p className="font-script text-4xl text-peach sm:text-5xl">Falta muy poquito</p>
        <p className="mt-1 mb-6 text-sm tracking-[0.2em] text-peach/80 uppercase first-letter:uppercase">
          {formatWeddingDate(couple.weddingDate)}
        </p>
        <Countdown date={weddingDateToIso(couple.weddingDate)} tone="light" />
      </section>

      <section className="card">
        <p className="eyebrow">Propuestas</p>
        <p className="mt-3 font-display text-5xl text-forest">{pending.length}</p>
        <p className="text-ink/70">esperando su respuesta</p>
        <Link href="/portal/propuestas" className="btn-accent mt-6">Ver propuestas</Link>
      </section>

      <section className="card">
        <p className="eyebrow">Checklist</p>
        <p className="mt-3 font-display text-5xl text-forest">{progress}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-peach-soft">
          <div className="h-full rounded-full bg-teal" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-ink/70">{done} de {couple.tasks.length} tareas listas</p>
        <Link href="/portal/checklist" className="btn-ghost mt-6">Ir al checklist</Link>
      </section>

      <section className="card">
        <p className="eyebrow">Último reporte</p>
        {lastReport ? (
          <>
            <h2 className="mt-3 font-display text-2xl text-forest">{lastReport.title}</h2>
            <p className="text-sm text-ink/60">{formatShortDate(lastReport.createdAt)}</p>
            <p className="mt-3 line-clamp-3 text-ink/80">{lastReport.body}</p>
            <Link href="/portal/reportes" className="btn-ghost mt-6">Leer reportes</Link>
          </>
        ) : (
          <p className="mt-3 text-ink/70">Todavía no hay reportes. ¡Pronto les contamos novedades!</p>
        )}
      </section>

      <section className="card flex flex-col items-start gap-4 bg-peach sm:flex-row sm:items-center sm:justify-between lg:col-span-3">
        <div>
          <p className="font-display text-2xl text-forest">Su página de casamiento</p>
          <p className="text-ink/80">Compártanla con sus invitados: horarios, lugar, dress code y regalos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/portal/mi-pagina" className="btn-primary">Editar</Link>
          <Link href={`/boda/${couple.slug}`} target="_blank" className="btn-ghost bg-white">Ver página ↗</Link>
        </div>
      </section>
    </div>
  );
}
