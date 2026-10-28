import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { coupleNames } from "@/core/couple";
import { formatShortDate } from "@/lib/format";
import { portal } from "@/server/container";
import { addProposal, addReport, deleteProposal, deleteReport, updateCouple } from "../../../actions";
import { RegenerateCodeForm } from "../../../forms";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada" } as const;

export default async function CoupleAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  const hidden = <input type="hidden" name="coupleId" value={couple.id} />;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-teal hover:underline">← Todas las parejas</Link>
        <h1 className="mt-2 font-display text-4xl text-forest">{coupleNames(couple)}</h1>
        <Link href={`/boda/${couple.slug}`} target="_blank" className="text-sm text-ink/60 hover:underline">
          /boda/{couple.slug} ↗
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="font-display text-2xl text-forest">Datos</h2>
          <form action={updateCouple} className="space-y-4">
            {hidden}
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="partnerA" defaultValue={couple.partnerA} aria-label="Novia / novio" className="field" />
              <input name="partnerB" defaultValue={couple.partnerB} aria-label="Novia / novio" className="field" />
            </div>
            <input name="weddingDate" type="datetime-local" defaultValue={couple.weddingDate} aria-label="Fecha" className="field" />
            <SubmitButton>Guardar</SubmitButton>
          </form>
        </section>

        <section className="card space-y-4">
          <h2 className="font-display text-2xl text-forest">Código de acceso</h2>
          <RegenerateCodeForm coupleId={couple.id} />
        </section>

        <section className="card space-y-4">
          <h2 className="font-display text-2xl text-forest">Nueva propuesta</h2>
          <form action={addProposal} className="space-y-3">
            {hidden}
            <input name="title" required placeholder="Título" className="field" />
            <textarea name="description" required rows={4} placeholder="Descripción" className="field" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="amount" placeholder="Presupuesto (opcional)" className="field" />
              <input name="link" type="url" placeholder="Link a material (opcional)" className="field" />
            </div>
            <SubmitButton className="btn-accent">Publicar propuesta</SubmitButton>
          </form>
        </section>

        <section className="card space-y-4">
          <h2 className="font-display text-2xl text-forest">Nuevo reporte</h2>
          <form action={addReport} className="space-y-3">
            {hidden}
            <input name="title" required placeholder="Ej: Reporte mensual · Noviembre" className="field" />
            <textarea name="body" required rows={6} placeholder="Avances, pagos, próximos pasos…" className="field" />
            <SubmitButton className="btn-accent">Publicar reporte</SubmitButton>
          </form>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-4 font-display text-2xl text-forest">Propuestas ({couple.proposals.length})</h2>
          <ul className="divide-y divide-forest/10">
            {couple.proposals.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-ink/60">{STATUS_LABEL[p.status]} · {formatShortDate(p.createdAt)}</p>
                  {p.coupleComment && <p className="mt-1 text-sm italic text-ink/80">“{p.coupleComment}”</p>}
                </div>
                <form action={deleteProposal}>
                  {hidden}
                  <input type="hidden" name="proposalId" value={p.id} />
                  <button className="text-sm text-ink/40 hover:text-rust">Borrar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-4 font-display text-2xl text-forest">Reportes ({couple.reports.length})</h2>
          <ul className="divide-y divide-forest/10">
            {couple.reports.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-ink/60">{formatShortDate(r.createdAt)}</p>
                </div>
                <form action={deleteReport}>
                  {hidden}
                  <input type="hidden" name="reportId" value={r.id} />
                  <button className="text-sm text-ink/40 hover:text-rust">Borrar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
