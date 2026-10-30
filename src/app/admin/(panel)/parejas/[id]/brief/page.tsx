import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { StatusChip } from "@/components/planner/brief";
import { SubmitButton } from "@/components/submit-button";
import { BRIEF_CATALOG } from "@/core/brief-catalog";
import { requireAdmin } from "@/server/auth";
import { portal } from "@/server/container";
import { addBriefBlock, removeBriefBlock } from "@/app/admin/planner-actions";
import { BriefBlockForm, IdeasForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function BriefAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const couple = await portal.getCouple((await params).id);
  if (!couple) notFound();

  const present = new Set(couple.brief.map((b) => b.key));
  const missing = BRIEF_CATALOG.filter((b) => !present.has(b.key));
  const hidden = <input type="hidden" name="coupleId" value={couple.id} />;
  const groups = [
    { title: "Datos del evento", blocks: couple.brief.filter((b) => b.kind === "event") },
    { title: "Proveedores", blocks: couple.brief.filter((b) => b.kind === "vendor") },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-forest">Brief</h2>
          <p className="hint">El detalle de cada rubro, como en el brief de Excel. La pareja ve el detalle de los rubros confirmados; las aclaraciones quedan internas.</p>
        </div>
        {missing.length > 0 && (
          <form action={addBriefBlock} className="flex items-end gap-2">
            {hidden}
            <div>
              <label htmlFor="add-block" className="label">Agregar rubro</label>
              <select id="add-block" name="key" className="field !py-2">
                {missing.map((b) => (
                  <option key={b.key} value={b.key}>{b.name}</option>
                ))}
              </select>
            </div>
            <SubmitButton className="btn-primary btn-sm mb-1" pendingText="…">
              <Icon name="plus" className="h-3.5 w-3.5" />
              Agregar
            </SubmitButton>
          </form>
        )}
      </div>

      <section className="card space-y-3">
        <h3 className="section-title">Ideas generales</h3>
        <IdeasForm coupleId={couple.id} ideas={couple.ideas} />
      </section>

      {groups.map((group) => (
        <section key={group.title} className="space-y-4">
          <h3 className="text-xs font-semibold tracking-[0.25em] text-rust uppercase">{group.title}</h3>
          {group.blocks.map((block) => (
            <details key={block.key} className="card group !p-0">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-6 py-5">
                <Icon name="arrowRight" className="h-4 w-4 text-teal transition-transform group-open:rotate-90" />
                <span className="font-display text-2xl text-forest">{block.name}</span>
                {block.vendor && <span className="text-sm text-ink/60">· {block.vendor}</span>}
                <span className="ml-auto flex items-center gap-2">
                  {block.owner && <span className="chip bg-white text-ink/60 ring-1 ring-forest/10">{block.owner}</span>}
                  <StatusChip status={block.status} />
                </span>
              </summary>
              <div className="space-y-4 border-t border-forest/5 px-6 py-5">
                <BriefBlockForm coupleId={couple.id} block={block} />
                <form action={removeBriefBlock} className="text-right">
                  {hidden}
                  <input type="hidden" name="key" value={block.key} />
                  <SubmitButton className="btn-ghost btn-sm" pendingText="…" confirm={`¿Quitar "${block.name}" del brief? Se pierde lo cargado.`}>
                    <Icon name="trash" className="h-3.5 w-3.5" />
                    Quitar rubro
                  </SubmitButton>
                </form>
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
