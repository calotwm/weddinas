import { Icon } from "@/components/icons";
import { BriefBlockSummary } from "@/components/planner/brief";
import { LineStateLegend } from "@/components/planner/line-state";
import { briefPaymentDetail, rubroReceipts } from "@/core/budget";
import { formatMoney } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { getCurrentCouple } from "../data";

export default async function VendorsPage() {
  const couple = await getCurrentCouple();
  // The couple only sees what is confirmed; vendors still being searched or decided stay internal.
  const vendors = couple.brief.filter((b) => b.kind === "vendor" && b.status === "confirmed");
  const { ipc } = await loadRates(couple.budget.usdQuote);
  // Every vendor block's "Pago" comes from the budget ("Sin pagos cargados" when the rubro has no item).
  const payment = (key: string) => briefPaymentDetail(couple.budget.items, key, ipc, formatMoney);
  const event = couple.brief.filter((b) => b.kind === "event" && b.status === "confirmed" && (b.fields.some((f) => f.detail) || (b.attachments ?? []).some((x) => !x.internal)));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-forest">Proveedores</h2>
          <p className="mt-1 text-sm text-ink/70">
            {vendors.length === 1 ? "1 proveedor confirmado" : `${vendors.length} proveedores confirmados`}. El equipo va completando el detalle de cada uno.
          </p>
          {vendors.some((b) => b.fields.some((f) => f.state)) && <div className="mt-3"><LineStateLegend /></div>}
        </div>
      </div>

      {vendors.length === 0 && (
        <div className="card text-center text-ink/60">
          <Icon name="users" className="mx-auto mb-2 h-8 w-8 text-mint" />
          Cuando confirmen proveedores, los van a ver acá con su detalle.
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        {vendors.map((block) => (
          <BriefBlockSummary
            key={block.key}
            coupleId={couple.id}
            block={block}
            payment={payment(block.key)}
            receipts={rubroReceipts(couple.budget.items, block.key)}
          />
        ))}
      </div>

      {event.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-display text-2xl text-forest">Su casamiento</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            {event.map((block) => (
              <BriefBlockSummary key={block.key} coupleId={couple.id} block={block} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
