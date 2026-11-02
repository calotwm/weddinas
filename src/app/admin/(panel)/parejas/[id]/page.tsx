import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { coupleNames, type Proposal } from "@/core/couple";
import { formatShortDate } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { addProposal, addReport, deleteProposal, deleteReport, updateCouple } from "../../../actions";
import { AdminAttachments } from "../../../admin-attachments";
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
  const hidden = <input type="hidden" name="coupleId" value={couple.id} />;

  return (
    <div className="space-y-8">
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
                <div className="min-w-0 flex-1">
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
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-teal">Archivos ({p.attachments?.length ?? 0})</summary>
                    <div className="mt-3">
                      <AdminAttachments coupleId={couple.id} kind="proposal" targetId={p.id} attachments={p.attachments} />
                    </div>
                  </details>
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
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="text-xs text-ink/50">{formatShortDate(r.createdAt)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/70">{r.body}</p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-teal">Archivos ({r.attachments?.length ?? 0})</summary>
                    <div className="mt-3">
                      <AdminAttachments coupleId={couple.id} kind="report" targetId={r.id} attachments={r.attachments} />
                    </div>
                  </details>
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
