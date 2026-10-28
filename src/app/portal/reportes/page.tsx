import { formatShortDate } from "@/lib/format";
import { getCurrentCouple } from "../data";

export default async function ReportsPage() {
  const { reports } = await getCurrentCouple();

  if (reports.length === 0) {
    return <p className="card text-ink/70">Todavía no hay reportes. Les vamos a ir contando cada avance por acá.</p>;
  }

  return (
    <ol className="relative space-y-6 border-l-2 border-mint/50 pl-6">
      {reports.map((r) => (
        <li key={r.id} className="relative">
          <span aria-hidden className="absolute top-8 -left-[33px] h-4 w-4 rounded-full border-4 border-cream bg-teal" />
          <article className="card">
            <p className="text-sm text-ink/60">{formatShortDate(r.createdAt)}</p>
            <h2 className="font-display text-2xl text-forest">{r.title}</h2>
            <p className="mt-4 whitespace-pre-line text-ink/80">{r.body}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}
