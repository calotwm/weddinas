import { notFound } from "next/navigation";
import { BriefBlockSummary } from "@/components/planner/brief";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { briefPaymentDetail } from "@/core/budget";
import { formatMoney } from "@/lib/format";
import { loadRates } from "@/server/rates";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

/** Confirmed vendors' briefs with the budget's "Pago" line; `?rubro=` prints a single vendor. */
export default async function VendorsDownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ rubro?: string }>;
}) {
  const couple = await sheetCouple(params);
  const { rubro } = await searchParams;
  const confirmed = couple.brief.filter((b) => b.kind === "vendor" && b.status === "confirmed");
  const vendors = rubro ? confirmed.filter((b) => b.key === rubro) : confirmed;
  if (rubro && vendors.length === 0) notFound();
  const { ipc } = await loadRates(couple.budget.usdQuote);

  return (
    <PrintSheet couple={couple} title={rubro ? vendors[0].name : "Proveedores"} back={downloadsPath(couple.id)}>
      {vendors.length === 0 && <p className="text-ink/60">Todavía no hay proveedores confirmados.</p>}
      <div className="space-y-5">
        {vendors.map((block) => (
          <BriefBlockSummary key={block.key} coupleId={couple.id} block={block} payment={briefPaymentDetail(couple.budget.items, block.key, ipc, formatMoney)} expanded />
        ))}
      </div>
    </PrintSheet>
  );
}
