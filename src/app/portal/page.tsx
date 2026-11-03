import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Countdown } from "@/components/countdown";
import { Icon } from "@/components/icons";
import { coverCss } from "@/core/url";
import { formatShortDate, weddingDateToIso } from "@/lib/format";
import { siteOrigin } from "@/server/site-url";
import { getCurrentCouple } from "./data";

export default async function PortalHome() {
  const couple = await getCurrentCouple();
  const pending = couple.proposals.filter((p) => p.status === "pending");
  const done = couple.tasks.filter((t) => t.done).length;
  const nextTasks = couple.tasks.filter((t) => !t.done).slice(0, 3);
  const progress = couple.tasks.length ? Math.round((done / couple.tasks.length) * 100) : 0;
  const lastReport = couple.reports[0];
  const publicUrl = `${await siteOrigin()}/boda/${couple.slug}`;
  const cover = coverCss(couple.slug, couple.publicInfo);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card relative overflow-hidden bg-forest text-center lg:col-span-3">
        {cover !== "none" && <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: cover }} />}
        <div className="relative py-4">
          <p className="font-script text-4xl text-peach sm:text-5xl">Cuenta regresiva</p>
          <p className="mt-1 mb-8 text-xs tracking-[0.3em] text-cream/70 uppercase">para el gran día</p>
          <Countdown date={weddingDateToIso(couple.weddingDate)} tone="light" />
        </div>
      </section>

      <section className="card flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-badge"><Icon name="sparkle" /></span>
          <h2 className="font-display text-2xl text-forest">Propuestas</h2>
        </div>
        <p className="mt-5 font-display text-5xl text-forest">{pending.length}</p>
        <p className="text-ink/60">{pending.length === 1 ? "propuesta espera su respuesta" : "propuestas esperan su respuesta"}</p>
        {pending[0] && <p className="mt-3 line-clamp-1 text-sm text-ink/80">Última: {pending[0].title}</p>}
        <Link href="/portal/propuestas" className={`${pending.length ? "btn-accent" : "btn-ghost"} mt-6 self-start`}>
          {pending.length ? "Responder" : "Ver propuestas"}
          <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </section>

      <section className="card flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-badge"><Icon name="checklist" /></span>
          <h2 className="font-display text-2xl text-forest">Checklist</h2>
        </div>
        <div className="mt-5 flex items-baseline gap-2">
          <p className="font-display text-5xl text-forest">{progress}%</p>
          <p className="text-sm text-ink/60">{done} de {couple.tasks.length}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-gradient-to-r from-mint to-teal transition-all" style={{ width: `${progress}%` }} />
        </div>
        {nextTasks.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
            {nextTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                <span className="line-clamp-1">{t.title}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/portal/checklist" className="btn-ghost mt-6 self-start">Ir al checklist</Link>
      </section>

      <section className="card flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-badge"><Icon name="file" /></span>
          <h2 className="font-display text-2xl text-forest">Último reporte</h2>
        </div>
        {lastReport ? (
          <>
            <h3 className="mt-5 text-lg font-semibold leading-snug text-ink">{lastReport.title}</h3>
            <p className="text-sm font-medium text-teal">{formatShortDate(lastReport.createdAt)}</p>
            <p className="mt-3 line-clamp-3 text-sm text-ink/80">{lastReport.body}</p>
            <Link href="/portal/reportes" className="btn-ghost mt-6 self-start">Leer reportes</Link>
          </>
        ) : (
          <p className="mt-5 text-ink/60">Todavía no hay reportes. ¡Pronto les contamos novedades!</p>
        )}
      </section>

      <section className="card flex flex-col gap-5 bg-peach-soft lg:col-span-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="icon-badge bg-white"><Icon name="heart" /></span>
          <div>
            <p className="font-display text-2xl text-forest">Su página de casamiento</p>
            <p className="text-ink/70">Compártanla con sus invitados: horarios, lugar, dress code y regalos.</p>
            <p className="mt-2 font-mono text-xs break-all text-ink/50">{publicUrl}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/mi-pagina" className="btn-primary">
            <Icon name="edit" className="h-4 w-4" />
            Editar
          </Link>
          <CopyButton text={publicUrl} label="Copiar link" className="btn-ghost" />
          <Link href={`/boda/${couple.slug}`} target="_blank" className="btn-ghost">
            <Icon name="external" className="h-4 w-4" />
            Ver
          </Link>
        </div>
      </section>
    </div>
  );
}
