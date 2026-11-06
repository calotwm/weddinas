import Link from "next/link";
import { Countdown } from "@/components/countdown";
import { Icon } from "@/components/icons";
import { categoryName } from "@/core/brief-catalog";
import { dueItems } from "@/core/budget";
import { checklistSections, isPresented } from "@/core/couple";
import { coverCss } from "@/core/url";
import { currentMonth, formatDay, formatMoney, monthEnd, today, weddingDateToIso } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { getCurrentCouple } from "./data";

export default async function PortalHome() {
  const couple = await getCurrentCouple();
  const pending = couple.proposals.filter((p) => isPresented(p) && p.status === "pending");
  const done = couple.tasks.filter((t) => t.done).length;
  const checklist = checklistSections(couple.tasks, currentMonth());
  const thisMonthOpen = checklist.thisMonth.filter((t) => !t.done);
  const noMonthOpen = checklist.noMonth.filter((t) => !t.done);
  const upcomingOpen = checklist.upcoming.flatMap((g) => g.tasks).filter((t) => !t.done).length;
  const progress = couple.tasks.length ? Math.round((done / couple.tasks.length) * 100) : 0;
  const { ipc } = await loadRates(couple.budget.usdQuote);
  const day = today();
  const due = dueItems(couple.budget.items, ipc, day, monthEnd(day));
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
        {checklist.overdue.length > 0 && (
          <p className="mt-4 text-sm font-semibold text-rust">
            {checklist.overdue.length} pendiente{checklist.overdue.length === 1 ? "" : "s"} de meses anteriores
          </p>
        )}
        {thisMonthOpen.length > 0 && (
          <div className="mt-4">
            <p className="label !mb-1.5">Este mes</p>
            <ul className="space-y-1.5 text-sm text-ink/80">
              {thisMonthOpen.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rust" />
                  <span className="line-clamp-1">{t.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {upcomingOpen > 0 && <p className="mt-3 text-sm text-ink/60">Próximos meses: {upcomingOpen} tarea{upcomingOpen === 1 ? "" : "s"}</p>}
        {noMonthOpen.length > 0 && thisMonthOpen.length === 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
            {noMonthOpen.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                <span className="line-clamp-1">{t.title}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/portal/checklist" className="btn-ghost mt-6 self-start">Ir al checklist</Link>
      </section>

      <section className="card flex flex-col">
        <div className="flex items-center gap-3">
          <span className="icon-badge"><Icon name="dollar" /></span>
          <h2 className="font-display text-2xl text-forest">Pagos pendientes</h2>
        </div>
        {due.length > 0 ? (
          <ul className="mt-5 divide-y divide-forest/8">
            {due.map(({ item, pending: amount, overdue }) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-forest">{item.vendor || categoryName(item.category)}</p>
                  <p className={`text-sm ${overdue ? "font-semibold text-rust" : "text-ink/60"}`}>
                    {overdue ? "Venció el" : "Vence el"} {formatDay(item.dueDate!)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-rust">{formatMoney(amount, item.currency)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 text-ink/60">No tienen pagos que venzan este mes.</p>
        )}
        <Link href="/portal/presupuesto" className="btn-ghost mt-6 self-start">Ver presupuesto</Link>
      </section>
    </div>
  );
}
