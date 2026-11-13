import { AttachmentList } from "@/components/attachments";
import { ComparisonTableView } from "@/components/planner/comparison-table";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { categoryName } from "@/core/brief-catalog";
import { isPresented, type Proposal } from "@/core/couple";
import { daysAgo, isNewProposal, presentedAt } from "@/core/notifications";
import { formatShortDate } from "@/lib/format";
import { portal } from "@/server/container";
import { chooseProposalVendor, commentOnProposal, respondToProposal, setProposalFinalist } from "../actions";
import { getCurrentCouple } from "../data";
import { CommentThread } from "./comment-thread";

export const dynamic = "force-dynamic";

type VisibleStatus = Exclude<Proposal["status"], "discarded">;

const STATUS: Record<VisibleStatus, { label: string; className: string }> = {
  pending: { label: "Esperando respuesta", className: "bg-peach text-rust" },
  approved: { label: "Elegida", className: "bg-mint/25 text-forest" },
  rejected: { label: "No va", className: "bg-ink/8 text-ink/60" },
};

type VisibleProposal = Proposal & { status: VisibleStatus };

function uploadedAgo(iso: string) {
  const days = daysAgo(iso);
  return days === 0 ? "subida hoy" : days === 1 ? "subida hace 1 día" : `subida hace ${days} días`;
}

const ORDER: Record<VisibleStatus, number> = { pending: 0, approved: 1, rejected: 2 };

/** Choosing one ("Elegir") closes its rubro: tell the couple when that will discard other open options. */
function approveConfirm(p: Proposal, all: Proposal[], brief: Parameters<typeof categoryName>[1], choice = `"${p.title}"`) {
  if (!p.category) return undefined;
  const others = all.filter((o) => o.id !== p.id && o.category === p.category && o.status === "pending").length;
  if (others === 0) return undefined;
  return `Al elegir ${choice} queda confirmado ${categoryName(p.category, brief)} y las otras ${others === 1 ? "propuesta" : `${others} propuestas`} de ese rubro se descartan. ¿Seguimos?`;
}

/** Choosing a vendor of the table approves the proposal, so it closes the rubro the same way; switching vendors only asks to confirm. */
function chooseConfirm(p: Proposal, vendor: string, all: Proposal[], brief: Parameters<typeof categoryName>[1]) {
  if (p.status === "pending") return approveConfirm(p, all, brief, vendor);
  return p.chosenVendor ? `¿Cambiamos ${p.chosenVendor} por ${vendor}?` : undefined;
}

export default async function ProposalsPage() {
  const couple = await getCurrentCouple();
  const coupleId = couple.id;
  // Discarded ones lost to another proposal of their rubro: the couple only keeps the chosen one.
  const proposals = couple.proposals.filter((p): p is VisibleProposal => isPresented(p) && p.status !== "discarded");
  if (proposals.some((p) => !p.viewedAt)) await portal.markProposalsViewed(coupleId);

  if (proposals.length === 0) {
    return (
      <div className="card flex flex-col items-center py-12 text-center">
        <span className="icon-badge mb-4"><Icon name="sparkle" /></span>
        <p className="font-display text-2xl text-forest">Todavía no hay propuestas</p>
        <p className="mt-1 text-ink/60">Cuando les armemos una, la van a ver acá para elegirla o comentarla.</p>
      </div>
    );
  }

  const sorted = [...proposals].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <div className="space-y-6">
      {sorted.map((p) => (
        // A comparison table needs room: that proposal takes the whole page width, the rest keep a readable column.
        <article key={p.id} className={`card mx-auto ${p.comparison ? "w-full" : "max-w-3xl"} ${p.status === "pending" ? "ring-2 ring-peach" : ""}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-teal">
                {formatShortDate(presentedAt(p))}
                {p.category && <span className="text-ink/50"> · {categoryName(p.category, couple.brief)}</span>}
              </p>
              <h2 className="mt-1 font-display text-2xl leading-snug text-forest sm:text-3xl">{p.title}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isNewProposal(p) && <span className="chip bg-rust text-white">Nuevo · {uploadedAgo(presentedAt(p))}</span>}
              {p.finalist && (
                <span className="chip bg-teal/15 text-forest">
                  <Icon name="heart" className="h-3.5 w-3.5 text-rust" />
                  Finalista
                </span>
              )}
              <span className={`chip ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-line text-ink/80">{p.description}</p>
          <div className="mt-4">
            <AttachmentList coupleId={coupleId} attachments={p.attachments} />
          </div>
          {p.comparison && (
            <div className="mt-5 space-y-2">
              <h3 className="font-display text-xl text-forest">
                Cuadro comparativo{p.category && ` · ${categoryName(p.category, couple.brief)}`}
              </h3>
              <ComparisonTableView
                table={p.comparison}
                chosen={p.chosenVendor}
                renderChoose={(vendor) => (
                  <form action={chooseProposalVendor}>
                    <input type="hidden" name="proposalId" value={p.id} />
                    <input type="hidden" name="vendor" value={vendor} />
                    <SubmitButton className="btn-ghost btn-sm bg-white" pendingText="Eligiendo…" confirm={chooseConfirm(p, vendor, proposals, couple.brief)}>
                      Elegir
                    </SubmitButton>
                  </form>
                )}
              />
              {p.chosenVendor && <p className="hint">Eligieron {p.chosenVendor}. Si cambian de idea, elijan otro proveedor del cuadro.</p>}
            </div>
          )}

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

          <form action={setProposalFinalist} className="mt-5">
            <input type="hidden" name="proposalId" value={p.id} />
            <input type="hidden" name="finalist" value={p.finalist ? "false" : "true"} />
            <SubmitButton className="btn-ghost btn-sm" pendingText="…">
              <Icon name="heart" className="h-3.5 w-3.5" />
              {p.finalist ? "Quitar de finalistas" : "Marcar como finalista"}
            </SubmitButton>
          </form>

          {p.status === "pending" ? (
            <form action={respondToProposal} className="mt-6 space-y-3 border-t border-forest/10 pt-6">
              <input type="hidden" name="proposalId" value={p.id} />
              <label className="label" htmlFor={`comment-${p.id}`}>Comentarios (opcional)</label>
              <textarea id={`comment-${p.id}`} name="comment" rows={2} maxLength={1000} className="field" placeholder="¿Algo que quieran cambiar o preguntar?" />
              <div className="flex flex-wrap gap-3">
                <SubmitButton name="status" value="approved" pendingText="Enviando…" confirm={approveConfirm(p, proposals, couple.brief)}>
                  <Icon name="check" className="h-4 w-4" />
                  Elegir
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

          <section className="mt-6 space-y-3 border-t border-forest/10 pt-5" aria-label={`Preguntas sobre ${p.title}`}>
            <h3 className="label">Preguntas y aclaraciones</h3>
            <CommentThread comments={p.comments} viewer="couple" />
            <form action={commentOnProposal} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input type="hidden" name="proposalId" value={p.id} />
              <label className="sr-only" htmlFor={`question-${p.id}`}>Dejanos una pregunta sobre {p.title}</label>
              <textarea
                id={`question-${p.id}`}
                name="comment"
                required
                rows={2}
                maxLength={1000}
                className="field flex-1"
                placeholder="¿Tienen alguna pregunta o aclaración? Escríbannos acá."
              />
              <SubmitButton className="btn-ghost btn-sm" pendingText="Enviando…" doneText="¡Enviado!">
                Enviar
              </SubmitButton>
            </form>
          </section>
        </article>
      ))}
    </div>
  );
}
