import type { Proposal } from "@/core/couple";
import { formatShortDate } from "@/lib/format";
import { respondToProposal } from "../actions";
import { getCurrentCouple } from "../data";

const STATUS: Record<Proposal["status"], { label: string; className: string }> = {
  pending: { label: "Esperando respuesta", className: "bg-peach text-rust" },
  approved: { label: "Aprobada", className: "bg-mint/30 text-forest" },
  rejected: { label: "Rechazada", className: "bg-ink/10 text-ink/70" },
};

export default async function ProposalsPage() {
  const { proposals } = await getCurrentCouple();

  if (proposals.length === 0) {
    return <p className="card text-ink/70">Todavía no hay propuestas. Cuando les armemos una, la van a ver acá.</p>;
  }

  return (
    <div className="space-y-6">
      {proposals.map((p) => (
        <article key={p.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink/60">{formatShortDate(p.createdAt)}</p>
              <h2 className="font-display text-2xl text-forest">{p.title}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS[p.status].className}`}>
              {STATUS[p.status].label}
            </span>
          </div>
          <p className="mt-4 whitespace-pre-line text-ink/80">{p.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {p.amount && <p><span className="label inline">Presupuesto</span> {p.amount}</p>}
            {p.link && (
              <a href={p.link} target="_blank" rel="noreferrer" className="text-teal underline underline-offset-4">
                Ver material ↗
              </a>
            )}
          </div>

          {p.status === "pending" ? (
            <form action={respondToProposal} className="mt-6 space-y-3 border-t border-forest/10 pt-6">
              <input type="hidden" name="proposalId" value={p.id} />
              <label className="label" htmlFor={`comment-${p.id}`}>Comentarios (opcional)</label>
              <textarea id={`comment-${p.id}`} name="comment" rows={2} className="field" placeholder="¿Algo que quieran cambiar?" />
              <div className="flex flex-wrap gap-3">
                <button name="status" value="approved" className="btn-primary">Aprobar</button>
                <button name="status" value="rejected" className="btn-ghost">No nos convence</button>
              </div>
            </form>
          ) : (
            p.coupleComment && (
              <blockquote className="mt-6 rounded-2xl bg-peach-soft p-4 text-ink/80">
                <span className="label">Su comentario</span>
                {p.coupleComment}
              </blockquote>
            )
          )}
        </article>
      ))}
    </div>
  );
}
