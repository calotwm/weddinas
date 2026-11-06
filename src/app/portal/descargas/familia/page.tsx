import { FamilyColumns } from "@/components/planner/family";
import { getCurrentCouple } from "../../data";
import { PrintSheet } from "../sheet";

export default async function FamilyDownloadPage() {
  const couple = await getCurrentCouple();
  return (
    <PrintSheet couple={couple} title="Fotos familiares" back="/portal/familia">
      {couple.family.length === 0 && <p className="text-ink/60">Todavía no cargaron familiares.</p>}
      <FamilyColumns coupleId={couple.id} family={couple.family} sides={{ a: couple.partnerA, b: couple.partnerB }} />
    </PrintSheet>
  );
}
