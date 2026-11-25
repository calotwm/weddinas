import { Icon } from "@/components/icons";
import { timingDownloadUrl } from "@/core/timing-sheet";
import { TimingSchedule, VendorTimingTable } from "@/components/planner/timing";
import { getCurrentCouple } from "../data";

export default async function TimingPage() {
  const couple = await getCurrentCouple();
  const download = timingDownloadUrl(couple.teamFiles.timingSheetUrl);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-forest">Timing</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink/70">
          El cronograma del día, momento a momento. Lo arma el equipo Weddinas con ustedes; si quieren cambiar algo, avísennos.
        </p>
      </div>
      {download && (
        <a href={download} target="_blank" rel="noreferrer" className="btn-primary btn-sm w-fit">
          <Icon name="download" className="h-4 w-4" />
          Descargar timing (Excel)
        </a>
      )}
      <TimingSchedule timing={couple.timing} />
      <VendorTimingTable items={couple.vendorTiming} />
    </div>
  );
}
