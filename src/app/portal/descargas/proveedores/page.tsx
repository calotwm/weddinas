import { notFound } from "next/navigation";
import { BriefBlockSummary } from "@/components/planner/brief";
import { briefPaymentLabel } from "@/core/budget";
import { formatMoney } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { getCurrentCouple } from "../../data";
import { PrintSheet } from "../sheet";

export default async function VendorsDownloadPage({ searchParams }: { searchParams: Promise<{ rubro?: string }> }) {
  const couple = await getCurrentCouple();
  const { rubro } = await searchParams;
  // Same rule as the Proveedores page: only confirmed vendors reach the couple.
  const confirmed = couple.brief.filter((b) => b.kind === "vendor" && b.status === "confirmed");
  const vendors = rubro ? confirmed.filter((b) => b.key === rubro) : confirmed;
  if (rubro && vendors.length === 0) notFound();
  const { ipc } = await loadRates(couple.budget.usdQuote);

  return (
    <PrintSheet couple={couple} title={rubro ? vendors[0].name : "Proveedores"} back="/portal/proveedores">
      {vendors.length === 0 && <p className="text-ink/60">Todavía no hay proveedores confirmados.</p>}
      <div className="space-y-5">
        {vendors.map((block) => (
          <BriefBlockSummary key={block.key} coupleId={couple.id} block={block} payment={briefPaymentLabel(couple.budget.items, block.key, ipc, formatMoney)} expanded />
        ))}
      </div>
    </PrintSheet>
  );
}
