import { MusicSummary } from "@/components/planner/music";
import { PrintSheet } from "@/components/print/print-sheet";
import { downloadsPath } from "@/components/print/sheets";
import { sheetCouple } from "../data";

export const dynamic = "force-dynamic";

export default async function MusicDownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const couple = await sheetCouple(params);
  return (
    <PrintSheet couple={couple} title="Elección de canciones" back={downloadsPath(couple.id)}>
      <MusicSummary music={couple.music} />
    </PrintSheet>
  );
}
