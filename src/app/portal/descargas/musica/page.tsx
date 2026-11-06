import { MusicSummary } from "@/components/planner/music";
import { getCurrentCouple } from "../../data";
import { PrintSheet } from "../sheet";

export default async function MusicDownloadPage() {
  const couple = await getCurrentCouple();
  return (
    <PrintSheet couple={couple} title="Elección de canciones" back="/portal/musica">
      <MusicSummary music={couple.music} />
    </PrintSheet>
  );
}
