import { Icon } from "@/components/icons";
import { BriefBlockSummary } from "@/components/planner/brief";
import { getCurrentCouple } from "../data";

export default async function VendorsPage() {
  const couple = await getCurrentCouple();
  // The couple only sees what is confirmed; vendors still being searched or decided stay internal.
  const vendors = couple.brief.filter((b) => b.kind === "vendor" && b.status === "confirmed");
  const event = couple.brief.filter((b) => b.kind === "event" && b.status === "confirmed" && b.fields.some((f) => f.detail));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-3xl text-forest">Proveedores</h2>
        <p className="mt-1 text-sm text-ink/70">
          {vendors.length === 1 ? "1 proveedor confirmado" : `${vendors.length} proveedores confirmados`}. El equipo va completando el detalle de cada uno.
        </p>
      </div>

      {vendors.length === 0 && (
        <div className="card text-center text-ink/60">
          <Icon name="users" className="mx-auto mb-2 h-8 w-8 text-mint" />
          Cuando confirmen proveedores, los van a ver acá con su detalle.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {vendors.map((block) => (
          <BriefBlockSummary key={block.key} block={block} />
        ))}
      </div>

      {event.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold tracking-[0.25em] text-rust uppercase">Su casamiento</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            {event.map((block) => (
              <BriefBlockSummary key={block.key} block={block} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
