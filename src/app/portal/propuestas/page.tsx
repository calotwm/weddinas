import { AttachmentList } from "@/components/attachments";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { isPresented, type Proposal } from "@/core/couple";
import { daysAgo, isNewProposal, presentedAt } from "@/core/notifications";
import { formatShortDate } from "@/lib/format";
import { respondToProposal } from "../actions";
import { getCurrentCouple } from "../data";

const STATUS: Record<Proposal["status"], { label: string; className: string }> = {
  pending: { label: "Esperando respuesta", className: "bg-peach text-rust" },
  approved: { label: "Aprobada", className: "bg-mint/25 text-forest" },
  rejected: { label: "No va", className: "bg-ink/8 text-ink/60" },
};

function uploadedAgo(iso: string) {
  const days = daysAgo(iso);
  return days === 0 ? "subida hoy" : days === 1 ? "subida hace 1 día" : `subida hace ${days} días`;
}

const ORDER: Record<Proposal["status"], number> = { pending: 0, approved: 1, rejected: 2 };

export default async function ProposalsPage() {
  const couple = await getCurrentCouple();
  const coupleId = couple.id;
  const proposals = couple.proposals.filter(isPresented);

  if (proposals.length === 0) {
    return (
      <div className="card flex flex-col items-center py-12 text-center">
        <span className="icon-badge mb-4"><Icon name="sparkle" /></span>
        <p className="font-display text-2xl text-forest">Todavía no hay propuestas</p>
        <p className="mt-1 text-ink/60">Cuando les armemos una, la van a ver acá para aprobarla o comentarla.</p>
      </div>
    );
  }

  const sorted = [...proposals].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {sorted.map((p) => (
        <article key={p.id} className={`card ${p.status === "pending" ? "ring-2 ring-peach" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-teal">{formatShortDate(presentedAt(p))}</p>
              <h2 className="mt-1 font-display text-2xl leading-snug text-forest sm:text-3xl">{p.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isNewProposal(p) && <span className="chip bg-rust text-white">Nuevo · {uploadedAgo(presentedAt(p))}</span>}
              <span className={`chip ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-ink/80">{p.description}</p>
          <div className="mt-4">
            <AttachmentList coupleId={coupleId} attachments={p.attachments} />
          </div>

          {(p.amount || p.link) && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {p.amount && (
                <div className="rounded-2xl bg-sand px-4 py-2">
                  <p className="text-[11px] tracking-[0.15em] text-forest/70 uppercase">Presupuesto</p>
                  <p className="font-display text-xl text-forest">{p.amount}</p>
                </div>
              )}
              {p.link && (
                <a href={p.link} target="_blank" rel="noreferrer noopener" className="btn-ghost btn-sm">
                  <Icon name="external" className="h-3.5 w-3.5" />
                  Ver material
                </a>
              )}
            </div>
          )}

          {p.status === "pending" ? (
            <form action={respondToProposal} className="mt-6 space-y-3 border-t border-forest/10 pt-6">
              <input type="hidden" name="proposalId" value={p.id} />
              <label className="label" htmlFor={`comment-${p.id}`}>Comentarios (opcional)</label>
              <textarea id={`comment-${p.id}`} name="comment" rows={2} maxLength={1000} className="field" placeholder="¿Algo que quieran cambiar o preguntar?" />
              <div className="flex flex-wrap gap-3">
                <SubmitButton name="status" value="approved" pendingText="Enviando…">
                  <Icon name="check" className="h-4 w-4" />
                  Aprobar
                </SubmitButton>
                <SubmitButton
                  name="status"
                  value="rejected"
                  className="btn-ghost"
                  pendingText="Enviando…"
                  confirm="¿Seguros que esta propuesta no los convence? Les vamos a armar otra."
                >
                  No nos convence
                </SubmitButton>
              </div>
            </form>
          ) : (
            <div className="mt-6 border-t border-forest/10 pt-5 text-sm text-ink/60">
              {p.respondedAt && <p>Respondida el {formatShortDate(p.respondedAt)}</p>}
              {p.coupleComment && (
                <blockquote className="mt-3 rounded-2xl bg-peach-soft p-4 text-base text-ink/80">
                  <span className="label">Su comentario</span>
                  {p.coupleComment}
                </blockquote>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
