import { FamilyColumns } from "@/components/planner/family";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

export default async function FamilyDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  return (
    <PrintSheet couple={couple} title="Fotos familiares" back={downloadsPath(couple.id)}>
      {couple.family.length === 0 && <p className="text-ink/60">Todavía no hay familiares cargados.</p>}
      <FamilyColumns coupleId={couple.id} family={couple.family} sides={{ a: couple.partnerA, b: couple.partnerB }} />
    </PrintSheet>
  );
}
