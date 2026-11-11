import Link from "next/link";
import type { BlockStatus, BriefBlock } from "@/core/couple";
import { AttachmentList } from "@/components/attachments";
import { LINE_STATE_DOT, LineStateChip } from "@/components/planner/line-state";
import { Icon } from "@/components/icons";
import { noteLines, type NoteLine } from "@/core/notes";

const PREVIEW_LINES = 3;

function NoteLines({ lines }: { lines: NoteLine[] }) {
  return (
    <ul className="space-y-1">
      {lines.map((line, i) =>
        line.kind === "heading" ? (
          <li key={i} className="pt-2 font-semibold text-forest first:pt-0">{line.text}</li>
        ) : (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            <span>{line.text}</span>
          </li>
        ),
      )}
    </ul>
  );
}

/** A planner's note as a list: one item per line, with headings for its groups. Long notes show a "Ver más". */
export function NoteText({ text, collapse = false }: { text: string; collapse?: boolean }) {
  const lines = noteLines(text);
  if (lines.length <= 1) return <>{lines[0]?.text}</>;
  if (!collapse || lines.length <= PREVIEW_LINES + 1) return <NoteLines lines={lines} />;
  return (
    <details className="group">
      <summary className="list-none">
        <NoteLines lines={lines.slice(0, PREVIEW_LINES)} />
        <span className="mt-1 inline-block cursor-pointer text-sm font-semibold text-teal group-open:hidden">Ver más ({lines.length - PREVIEW_LINES})</span>
      </summary>
      <div className="mt-1">
        <NoteLines lines={lines.slice(PREVIEW_LINES)} />
      </div>
    </details>
  );
}

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

/**
 * Couple-facing view of one brief block: only filled details; the Aclaraciones column stays internal.
 * `expanded` shows long details whole (printable pages); `download` links to the block's printable page.
 */
export function BriefBlockSummary({ coupleId, block, expanded = false, download }: { coupleId: string; block: BriefBlock; expanded?: boolean; download?: string }) {
  const filled = block.fields.filter((f) => f.detail || f.state);
  const shared = (block.attachments ?? []).filter((a) => !a.internal);
  return (
    <article className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl text-forest">{block.name}</h3>
          {block.vendor && <p className="text-sm font-semibold text-teal">{block.vendor}</p>}
        </div>
        <div className="flex items-center gap-2">
          {download && (
            <Link href={download} className="btn-ghost btn-sm">
              <Icon name="file" className="h-3.5 w-3.5" />
              Descargar
            </Link>
          )}
          <StatusChip status={block.status} />
        </div>
      </div>
      {filled.length > 0 || shared.length > 0 ? (
        <>
          {filled.length > 0 && (
            <dl className="divide-y divide-forest/10 rounded-2xl bg-cream/70 px-4 ring-1 ring-forest/5">
              {filled.map((f, i) => (
                <div key={`${f.label}-${i}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-4">
                  <dt className="flex items-start gap-2 text-sm font-semibold text-forest">
                    <span aria-hidden className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${f.state ? LINE_STATE_DOT[f.state] : "bg-rust"}`} />
                    {f.label}
                  </dt>
                  <dd className="space-y-1 text-ink">
                    {f.detail && <NoteText text={f.detail} collapse={!expanded} />}
                    {f.state && <LineStateChip state={f.state} />}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {shared.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-forest">Documentos</p>
              <AttachmentList coupleId={coupleId} attachments={shared} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-ink/50">Todavía no hay detalles cargados.</p>
      )}
    </article>
  );
}
