import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { coupleNames, type Proposal } from "@/core/couple";
import { getCountdown } from "@/core/countdown";
import { formatShortDate, formatWeddingDate, weddingDateToIso } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { addProposal, addReport, deleteProposal, deleteReport, updateCouple } from "../../../actions";
import { RegenerateCodeForm } from "../../../forms";

export const dynamic = "force-dynamic";

const STATUS: Record<Proposal["status"], { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-peach text-rust" },
  approved: { label: "Aprobada", className: "bg-mint/25 text-forest" },
  rejected: { label: "Rechazada", className: "bg-ink/8 text-ink/60" },
};

export default async function CoupleAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  const names = coupleNames(couple);
  const origin = await siteOrigin();
  const publicUrl = `${origin}/boda/${couple.slug}`;
  const { days, isPast } = getCountdown(new Date(weddingDateToIso(couple.weddingDate)));
  const done = couple.tasks.filter((t) => t.done).length;
  const pending = couple.proposals.filter((p) => p.status === "pending").length;
  const hidden = <input type="hidden" name="coupleId" value={couple.id} />;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-teal hover:underline">
          <Icon name="arrowLeft" className="h-4 w-4" />
          Todas las parejas
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-forest sm:text-5xl">{names}</h1>
            <p className="mt-1 inline-block text-ink/60 first-letter:uppercase">{formatWeddingDate(couple.weddingDate)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={publicUrl} label="Copiar link de la página" />
            <Link href={`/boda/${couple.slug}`} target="_blank" className="btn-ghost btn-sm">
              <Icon name="external" className="h-3.5 w-3.5" />
              Ver página
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip bg-white text-forest ring-1 ring-forest/10">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            {isPast ? "Ya fue" : `Faltan ${days} días`}
          </span>
          <span className="chip bg-white text-forest ring-1 ring-forest/10">
            <Icon name="checklist" className="h-3.5 w-3.5" />
            Checklist {done}/{couple.tasks.length}
          </span>
          <span className={`chip ring-1 ring-forest/10 ${pending ? "bg-peach text-rust" : "bg-white text-forest"}`}>
            <Icon name="sparkle" className="h-3.5 w-3.5" />
            {pending} propuesta{pending === 1 ? "" : "s"} pendiente{pending === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-5">
          <h2 className="section-title">Nueva propuesta</h2>
          <form action={addProposal} className="space-y-4">
            {hidden}
            <div>
              <label htmlFor="p-title" className="label">Título</label>
              <input id="p-title" name="title" required maxLength={200} placeholder="Ej: Ambientación estilo campo" className="field" />
            </div>
            <div>
              <label htmlFor="p-description" className="label">Descripción</label>
              <textarea id="p-description" name="description" required rows={4} placeholder="Qué incluye, opciones, tiempos…" className="field" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="p-amount" className="label">Presupuesto</label>
                <input id="p-amount" name="amount" maxLength={100} placeholder="$ 1.500.000 (opcional)" className="field" />
              </div>
              <div>
                <label htmlFor="p-link" className="label">Link a material</label>
                <input id="p-link" name="link" type="url" maxLength={500} placeholder="https://… (opcional)" className="field" />
              </div>
            </div>
            <SubmitButton className="btn-accent" pendingText="Publicando…" doneText="¡Publicada!">Publicar propuesta</SubmitButton>
          </form>
        </section>

        <section className="card space-y-5">
          <h2 className="section-title">Nuevo reporte</h2>
          <form action={addReport} className="space-y-4">
            {hidden}
            <div>
              <label htmlFor="r-title" className="label">Título</label>
              <input id="r-title" name="title" required maxLength={200} placeholder="Ej: Reporte mensual · Noviembre" className="field" />
            </div>
            <div>
              <label htmlFor="r-body" className="label">Contenido</label>
              <textarea id="r-body" name="body" required rows={7} placeholder="Avances, pagos, próximos pasos…" className="field" />
            </div>
            <SubmitButton className="btn-accent" pendingText="Publicando…" doneText="¡Publicado!">Publicar reporte</SubmitButton>
          </form>
        </section>

        <section className="card">
          <h2 className="section-title mb-4">Propuestas <span className="text-ink/40">({couple.proposals.length})</span></h2>
          {couple.proposals.length === 0 && <p className="text-sm text-ink/50">Todavía no publicaste propuestas.</p>}
          <ul className="divide-y divide-forest/8">
            {couple.proposals.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{p.title}</p>
                    <span className={`chip py-0.5 ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
                  </div>
                  <p className="text-xs text-ink/50">
                    Publicada {formatShortDate(p.createdAt)}
                    {p.respondedAt && ` · respondida ${formatShortDate(p.respondedAt)}`}
                    {p.amount && ` · ${p.amount}`}
                  </p>
                  {p.coupleComment && <p className="mt-2 rounded-xl bg-peach-soft px-3 py-2 text-sm text-ink/80">“{p.coupleComment}”</p>}
                </div>
                <form action={deleteProposal}>
                  {hidden}
                  <input type="hidden" name="proposalId" value={p.id} />
                  <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Borrar la propuesta "${p.title}"?`}>
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sr-only">Borrar {p.title}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title mb-4">Reportes <span className="text-ink/40">({couple.reports.length})</span></h2>
          {couple.reports.length === 0 && <p className="text-sm text-ink/50">Todavía no publicaste reportes.</p>}
          <ul className="divide-y divide-forest/8">
            {couple.reports.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="text-xs text-ink/50">{formatShortDate(r.createdAt)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/70">{r.body}</p>
                </div>
                <form action={deleteReport}>
                  {hidden}
                  <input type="hidden" name="reportId" value={r.id} />
                  <SubmitButton className="btn-icon" pendingText="…" confirm={`¿Borrar el reporte "${r.title}"?`}>
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sr-only">Borrar {r.title}</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-5">
          <h2 className="section-title">Datos de la pareja</h2>
          <form action={updateCouple} className="space-y-4">
            {hidden}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="partnerA" className="label">Nombre 1</label>
                <input id="partnerA" name="partnerA" required maxLength={80} defaultValue={couple.partnerA} className="field" />
              </div>
              <div>
                <label htmlFor="partnerB" className="label">Nombre 2</label>
                <input id="partnerB" name="partnerB" required maxLength={80} defaultValue={couple.partnerB} className="field" />
              </div>
            </div>
            <div>
              <label htmlFor="weddingDate" className="label">Fecha y hora</label>
              <input id="weddingDate" name="weddingDate" type="datetime-local" required defaultValue={couple.weddingDate} className="field" />
            </div>
            <SubmitButton doneText="¡Guardado!">Guardar</SubmitButton>
          </form>
        </section>

        <section className="card space-y-4">
          <h2 className="section-title">Código de acceso</h2>
          <RegenerateCodeForm coupleId={couple.id} names={names} origin={origin} />
        </section>
      </div>
    </div>
  );
}
