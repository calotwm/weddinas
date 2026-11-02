import type { BlockStatus, BriefBlock } from "@/core/couple";
import { AttachmentList } from "@/components/attachments";

export const BLOCK_STATUS: Record<BlockStatus, { label: string; className: string }> = {
  searching: { label: "En búsqueda", className: "bg-sand text-ink/70" },
  deciding: { label: "Para decidir", className: "bg-peach text-rust" },
  confirmed: { label: "Confirmado", className: "bg-mint/25 text-forest" },
  na: { label: "No aplica", className: "bg-ink/8 text-ink/50" },
};

export function StatusChip({ status }: { status: BlockStatus }) {
  const s = BLOCK_STATUS[status];
  return <span className={`chip ${s.className}`}>{s.label}</span>;
}

/** Couple-facing view of one brief block: only filled details; the Aclaraciones column stays internal. */
export function BriefBlockSummary({ coupleId, block }: { coupleId: string; block: BriefBlock }) {
  const filled = block.fields.filter((f) => f.detail);
  const shared = (block.attachments ?? []).filter((a) => !a.internal);
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl text-forest">{block.name}</h3>
          {block.vendor && <p className="text-sm font-semibold text-teal">{block.vendor}</p>}
        </div>
        <StatusChip status={block.status} />
      </div>
      {filled.length > 0 || shared.length > 0 ? (
        <>
          {filled.length > 0 && (
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {filled.map((f, i) => (
                <div key={`${f.label}-${i}`}>
                  <dt className="text-xs tracking-wider text-ink/50 uppercase">{f.label}</dt>
                  <dd className="whitespace-pre-line text-ink">{f.detail}</dd>
                </div>
              ))}
            </dl>
          )}
          <AttachmentList coupleId={coupleId} attachments={shared} />
        </>
      ) : (
        <p className="text-sm text-ink/50">Todavía no hay detalles cargados.</p>
      )}
    </article>
  );
}
