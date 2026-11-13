import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { CommentThread } from "@/app/portal/propuestas/comment-thread";
import { BRIEF_CATALOG, categoryName } from "@/core/brief-catalog";
import { coupleNames, isPresented, type Proposal } from "@/core/couple";
import { formatShortDate } from "@/lib/format";
import { requireAdmin } from "@/server/auth";
import { WhatsappButton } from "@/components/whatsapp-button";
import { proposalMessage } from "@/core/whatsapp";
import { portal, welcomeTemplate } from "@/server/container";
import { siteOrigin } from "@/server/site-url";
import { deleteProposal, deleteReport, presentProposal, replyToProposal, updateCouple, updateProposal } from "../../../actions";
import { AdminAttachments } from "../../../admin-attachments";
import { AdminComparison, NewProposalForm } from "../../../comparison-form";
import { RegenerateCodeForm } from "../../../forms";

export const dynamic = "force-dynamic";

const STATUS: Record<Proposal["status"], { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-peach text-rust" },
  approved: { label: "Aprobada", className: "bg-mint/25 text-forest" },
  rejected: { label: "Rechazada", className: "bg-ink/8 text-ink/60" },
  discarded: { label: "Descartada", className: "bg-ink/8 text-ink/50" },
};

const VENDOR_RUBROS = BRIEF_CATALOG.filter((b) => b.kind === "vendor");

export default async function CoupleAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  const names = coupleNames(couple);
  const origin = await siteOrigin();
  const hidden = <input type="hidden" name="coupleId" value={couple.id} />;
  // The couple's custom rubros ("Otra opción" in the brief) can be picked too.
  const rubros = [...VENDOR_RUBROS, ...couple.brief.filter((b) => b.kind === "vendor" && !VENDOR_RUBROS.some((r) => r.key === b.key))];

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-5">
          <h2 className="section-title">Nueva propuesta</h2>
          <NewProposalForm coupleId={couple.id}>
            <div>
              <label htmlFor="p-title" className="label">Título</label>
              <input id="p-title" name="title" required maxLength={200} placeholder="Ej: Ambientación estilo campo" className="field" />
            </div>
            <div>
              <label htmlFor="p-description" className="label">Descripción</label>
              <textarea id="p-description" name="description" required rows={4} placeholder="Qué incluye, opciones, tiempos…" className="field" />
            </div>
            <div>
              <label htmlFor="p-category" className="label">Rubro</label>
              <select id="p-category" name="category" defaultValue="" className="field">
                <option value="">Sin rubro</option>
                {rubros.map((b) => (
                  <option key={b.key} value={b.key}>{b.name}</option>
                ))}
              </select>
              <p className="hint mt-1">Si los novios aprueban una propuesta con rubro, las otras pendientes de ese rubro se descartan y el proveedor queda confirmado en el brief.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="p-amount" className="label">Presupuesto destinado</label>
                <input id="p-amount" name="amount" maxLength={100} placeholder="$ 1.500.000 (opcional)" className="field" />
              </div>
              <div>
                <label htmlFor="p-link" className="label">Link a material</label>
                <input id="p-link" name="link" type="url" maxLength={500} placeholder="https://… (opcional)" className="field" />
              </div>
            </div>
          </NewProposalForm>
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
                    {isPresented(p) ? (
                      <span className={`chip py-0.5 ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
                    ) : (
                      <span className="chip bg-sand py-0.5 text-ink/70">Borrador</span>
                    )}
                    {p.finalist && p.status !== "discarded" && <span className="chip bg-teal/15 py-0.5 text-forest">Finalista</span>}
                    {p.chosenVendor && <span className="chip bg-peach-soft py-0.5 text-rust">Eligieron: {p.chosenVendor}</span>}
                  </div>
                  <p className="text-xs text-ink/50">
                    {isPresented(p) ? "Presentada" : "Creada"} {formatShortDate(p.presentedAt ?? p.createdAt)}
                    {p.respondedAt && ` · respondida ${formatShortDate(p.respondedAt)}`}
                    {p.amount && ` · ${p.amount}`}
                    {p.category && ` · ${categoryName(p.category, couple.brief)}`}
                  </p>
                  {isPresented(p) && (
                    <p className={`mt-1 text-xs ${p.viewedAt ? "text-teal" : "text-ink/50"}`}>
                      {p.viewedAt ? `Vista por los novios el ${formatShortDate(p.viewedAt)}` : "Todavía no la vieron"}
                    </p>
                  )}
                  {isPresented(p) && p.status === "pending" && (
                    <div className="mt-2">
                      <WhatsappButton phone={couple.whatsapp} text={proposalMessage(names, p.title, `${origin}/portal/propuestas`)} />
                    </div>
                  )}
                  {p.coupleComment && <p className="mt-2 rounded-xl bg-peach-soft px-3 py-2 text-sm text-ink/80">“{p.coupleComment}”</p>}
                  {isPresented(p) && (
                    <details className="mt-3" open={(p.comments?.length ?? 0) > 0}>
                      <summary className="cursor-pointer text-xs font-semibold text-teal">Preguntas ({p.comments?.length ?? 0})</summary>
                      <div className="mt-3 space-y-3">
                        <CommentThread comments={p.comments} viewer="team" />
                        <form action={replyToProposal} className="space-y-2">
                          {hidden}
                          <input type="hidden" name="proposalId" value={p.id} />
                          <label className="sr-only" htmlFor={`reply-${p.id}`}>Responder sobre {p.title}</label>
                          <textarea id={`reply-${p.id}`} name="comment" required rows={2} maxLength={1000} className="field" placeholder="Respondé o aclarale algo a los novios…" />
                          <SubmitButton className="btn-ghost btn-sm" pendingText="Enviando…" doneText="¡Enviado!">Responder</SubmitButton>
                        </form>
                      </div>
                    </details>
                  )}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-teal">Archivos ({p.attachments?.length ?? 0})</summary>
                    <div className="mt-3">
                      <AdminAttachments coupleId={couple.id} kind="proposal" targetId={p.id} attachments={p.attachments} />
                    </div>
                  </details>
                  <AdminComparison coupleId={couple.id} proposalId={p.id} comparison={p.comparison} chosen={p.chosenVendor} />
                  <ProposalEditForm coupleId={couple.id} proposal={p} rubros={rubros} />
                  {!isPresented(p) && (
                    <form action={presentProposal} className="mt-3">
                      {hidden}
                      <input type="hidden" name="proposalId" value={p.id} />
                      <SubmitButton className="btn-accent btn-sm" pendingText="Presentando…" confirm={`¿Presentar "${p.title}" a los novios?`}>
                        Presentar
                      </SubmitButton>
                    </form>
                  )}
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

        {couple.reports.length > 0 && (
        <section className="card">
          <h2 className="section-title mb-4">Reportes anteriores <span className="text-ink/40">({couple.reports.length})</span></h2>
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
        )}

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
            <div>
              <label htmlFor="whatsapp" className="label">WhatsApp de los novios</label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                maxLength={25}
                pattern="\+?[0-9 \-]{8,24}"
                defaultValue={couple.whatsapp ? `+${couple.whatsapp}` : ""}
                className="field"
                placeholder="Ej: 11 2233 4455"
              />
              <p className="hint">Con este número, los botones “Avisar por WhatsApp” abren directo su chat.</p>
            </div>
            <SubmitButton doneText="¡Guardado!">Guardar</SubmitButton>
          </form>
        </section>

        <section className="card space-y-4">
          <h2 className="section-title">Código de acceso</h2>
          <RegenerateCodeForm coupleId={couple.id} names={names} origin={origin} template={await welcomeTemplate()} />
        </section>
      </div>
    </div>
  );
}

/** The team's edit of a proposal's content, on any status. */
function ProposalEditForm({ coupleId, proposal: p, rubros }: { coupleId: string; proposal: Proposal; rubros: Array<{ key: string; name: string }> }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-teal">Editar</summary>
      <form action={updateProposal} className="mt-3 space-y-3">
        <input type="hidden" name="coupleId" value={coupleId} />
        <input type="hidden" name="proposalId" value={p.id} />
        <div>
          <label htmlFor={`e-title-${p.id}`} className="label">Título</label>
          <input id={`e-title-${p.id}`} name="title" required maxLength={200} defaultValue={p.title} className="field" />
        </div>
        <div>
          <label htmlFor={`e-description-${p.id}`} className="label">Descripción</label>
          <textarea id={`e-description-${p.id}`} name="description" rows={4} defaultValue={p.description} className="field" />
        </div>
        <div>
          <label htmlFor={`e-category-${p.id}`} className="label">Rubro</label>
          <select id={`e-category-${p.id}`} name="category" defaultValue={p.category ?? ""} className="field">
            <option value="">Sin rubro</option>
            {rubros.map((b) => (
              <option key={b.key} value={b.key}>{b.name}</option>
            ))}
            {p.category && !rubros.some((b) => b.key === p.category) && <option value={p.category}>{categoryName(p.category)}</option>}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`e-amount-${p.id}`} className="label">Presupuesto destinado</label>
            <input id={`e-amount-${p.id}`} name="amount" maxLength={100} defaultValue={p.amount} className="field" />
          </div>
          <div>
            <label htmlFor={`e-link-${p.id}`} className="label">Link a material</label>
            <input id={`e-link-${p.id}`} name="link" type="url" maxLength={500} defaultValue={p.link} className="field" />
          </div>
        </div>
        <SubmitButton className="btn-ghost btn-sm" pendingText="Guardando…" doneText="¡Guardado!">Guardar cambios</SubmitButton>
      </form>
    </details>
  );
}
