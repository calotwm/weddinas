import { AttachmentList } from "@/components/attachments";
import { Icon } from "@/components/icons";
import { formatShortDate } from "@/lib/format";
import { getCurrentCouple } from "../data";

export default async function ReportsPage() {
  const { id: coupleId, reports } = await getCurrentCouple();

  if (reports.length === 0) {
    return (
      <div className="card flex flex-col items-center py-12 text-center">
        <span className="icon-badge mb-4"><Icon name="file" /></span>
        <p className="font-display text-2xl text-forest">Todavía no hay reportes</p>
        <p className="mt-1 text-ink/60">Les vamos a ir contando cada avance por acá.</p>
      </div>
    );
  }

  return (
    <ol className="relative mx-auto max-w-3xl space-y-6 border-l-2 border-mint/40 pl-6 sm:pl-8">
      {reports.map((r, i) => (
        <li key={r.id} className="relative">
          <span
            aria-hidden
            className={`absolute top-9 -left-[33px] h-4 w-4 rounded-full border-4 border-cream sm:-left-[41px] ${i === 0 ? "bg-rust" : "bg-teal"}`}
          />
          <article className="card">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs tracking-wide text-ink/50 uppercase">{formatShortDate(r.createdAt)}</p>
              {i === 0 && <span className="chip bg-peach text-rust">Nuevo</span>}
            </div>
            <h2 className="mt-1 font-display text-2xl leading-snug text-forest">{r.title}</h2>
            <p className="mt-4 whitespace-pre-line text-ink/80">{r.body}</p>
            <div className="mt-4">
              <AttachmentList coupleId={coupleId} attachments={r.attachments} />
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
